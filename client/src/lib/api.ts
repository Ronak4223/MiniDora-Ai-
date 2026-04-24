/**
 * MiniDora v2 — API Client
 *
 * Handles SSE streaming with 5 packet types:
 *   { type: 'emotion', emotion }   — pre-response emotion signal
 *   { type: 'cache_hit' }          — instant answer incoming
 *   { type: 'tool', tool }         — code generation payload
 *   { choices: [{ delta: { content } }] } — text chunk
 *   [DONE]                         — stream complete
 *
 * Graceful offline: if server unreachable → local personality fallback
 */

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// ── Generic REST helper ───────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────
export type EmotionType = 'happy' | 'excited' | 'worried' | 'curious' | 'playful' | 'neutral';

export interface CodeTool {
  type:        'generateWebsiteCode';
  title:       string;
  description: string;
  code:        string;
}

export interface Conversation {
  conversationId: string;
  title:          string;
  characterId:    string;
  messageCount:   number;
  updatedAt:      string;
}

export interface ServerMessage {
  messageId:   string;
  role:        'user' | 'assistant';
  content:     string;
  characterId: string;
  timestamp:   string;
}

export interface CharacterMeta {
  id:          string;
  name:        string;
  emoji:       string;
  description: string;
}

// ── REST API surface ──────────────────────────────────────────
export const api = {
  signup: (userId: string, name: string, email: string, password: string) =>
    request('/users/signup', { method: 'POST', body: JSON.stringify({ userId, name, email, password }) }),

  login: (email: string, password: string) =>
    request('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getPreferences: (userId: string) =>
    request<Record<string, unknown>>(`/users/${userId}/preferences`),

  savePreferences: (userId: string, prefs: Record<string, unknown>) =>
    request(`/users/${userId}/preferences`, { method: 'PUT', body: JSON.stringify(prefs) }),

  getConversations: (userId: string) =>
    request<Conversation[]>(`/conversations?userId=${userId}`),

  createConversation: (data: { conversationId: string; userId: string; title?: string; characterId?: string }) =>
    request('/conversations', { method: 'POST', body: JSON.stringify(data) }),

  renameConversation: (id: string, title: string) =>
    request(`/conversations/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),

  deleteConversation: (id: string) =>
    request(`/conversations/${id}`, { method: 'DELETE' }),

  getMessages: (id: string) =>
    request<{ messages: ServerMessage[]; source: string }>(`/chat/messages/${id}`),

  getCharacters: () => request<CharacterMeta[]>('/characters'),

  health: () => request<{
    ok:              boolean;
    redis:           boolean;
    circuitBreakers: Record<string, unknown>;
    stats:           Record<string, unknown>;
  }>('/health'),

  chatStatus: () => request<{
    ok:              boolean;
    circuitBreakers: Record<string, unknown>;
    stats:           Record<string, unknown>;
  }>('/chat/status'),
};

// ── Offline fallback responses ────────────────────────────────
const OFFLINE_MESSAGES = [
  `Oh! My uplink is down 📡 *taps head* — but MiniDora offline mode is active! Still here for you. What's up?\n\n*(To enable real AI, start the server and configure at least one tier in .env)*`,
  `Quantum signal fuzzy today 🛸 Running on local memory, still fully MiniDora though. What do you need?`,
  `Pocket dimension comms are down! 😄 No worries — I have a built-in personality engine. Full AI kicks in when the server's back up.`,
];
let _offlineIdx = 0;

async function streamOffline(
  onChunk: (t: string) => void,
  onDone:  () => void,
  signal?: AbortSignal
) {
  const text = OFFLINE_MESSAGES[_offlineIdx++ % OFFLINE_MESSAGES.length];
  for (const word of text.split(' ')) {
    if (signal?.aborted) return;
    await new Promise(r => setTimeout(r, 22 + Math.random() * 22));
    if (signal?.aborted) return;
    onChunk(word + ' ');
  }
  if (!signal?.aborted) onDone();
}

// ═══════════════════════════════════════════════════════════════
// STREAMING CHAT
// ═══════════════════════════════════════════════════════════════
export interface StreamChatOptions {
  message:        string;
  conversationId: string;
  characterId:    string;
  userId:         string;
  history:        Array<{ role: string; content: string }>;
  offlineMode?:   boolean;
  onChunk:        (text: string) => void;
  onDone:         () => void;
  onError:        (msg: string) => void;
  onEmotion?:     (emotion: EmotionType) => void;
  onCacheHit?:    () => void;
  onTool?:        (tool: CodeTool) => void;
  signal?:        AbortSignal;
}

export async function streamChat({
  message, conversationId, characterId, userId, history,
  offlineMode = false,
  onChunk, onDone, onError, onEmotion, onCacheHit, onTool,
  signal,
}: StreamChatOptions): Promise<void> {
  if (signal?.aborted) return;

  // True offline (no network or forced)
  if (offlineMode || !navigator.onLine) {
    await streamOffline(onChunk, onDone, signal);
    return;
  }

  // Attempt server connection
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message, conversationId, characterId, userId, history, offlineMode }),
      signal,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return;
    // Network error — fall back to offline personality
    await streamOffline(onChunk, onDone, signal);
    return;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, string>;
    onError(data?.error || `Server error (${res.status})`);
    return;
  }

  if (!res.body) {
    onError('No response stream from server');
    return;
  }

  // ── Parse SSE stream ─────────────────────────────────────────
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf      = '';
  let finished = false;

  signal?.addEventListener('abort', () => reader.cancel().catch(() => {}));

  try {
    while (!finished) {
      if (signal?.aborted) { reader.cancel().catch(() => {}); return; }

      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data: ')) continue;

        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { finished = true; break; }

        try {
          const obj = JSON.parse(payload) as Record<string, unknown>;

          // Metadata packets
          if (obj.type === 'emotion' && onEmotion) {
            onEmotion(obj.emotion as EmotionType);
            continue;
          }
          if (obj.type === 'cache_hit' && onCacheHit) {
            onCacheHit();
            continue;
          }
          if (obj.type === 'tool' && onTool && obj.tool) {
            onTool(obj.tool as CodeTool);
            continue;
          }

          // Text delta
          const choices = obj.choices as Array<{ delta: { content?: string } }> | undefined;
          const text = choices?.[0]?.delta?.content;
          if (text) onChunk(text);

        } catch { /* skip malformed packet */ }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return;
    onError(e instanceof Error ? e.message : 'Stream read error');
    return;
  } finally {
    reader.cancel().catch(() => {});
  }

  if (!signal?.aborted) onDone();
}
