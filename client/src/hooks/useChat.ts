/**
 * MiniDora v2 — useChat
 *
 * State: messages, conversations, typing, mascotState, isOfflineMode, lastCodeTool
 * Streaming: SSE via streamChat → typewriter effect in real time
 * Storage: localStorage (v2 key) with auto-hydration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { streamChat } from '@/lib/api';
import type { EmotionType, CodeTool } from '@/lib/api';
import { speak } from '@/lib/voice';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MascotState = 'idle' | 'listening' | 'thinking' | 'offline';

export interface Message {
  id:         string;
  role:       'user' | 'assistant';
  content:    string;
  timestamp:  Date;
  emotion?:   EmotionType;
  tool?:      CodeTool;
  fromCache?: boolean;
}

export interface Conversation {
  id:        string;
  title:     string;
  updatedAt: string;
}

const GREETING = `Hey! *ears perk up* 🐾\n\nI'm MiniDora — robotic cat companion from the 22nd century, stationed here to help you. I also have an Anywhere Door (I'm not supposed to mention it... oops).\n\nWhat's on your mind?`;
const STORAGE_KEY = 'minidora-v2';

function mkMsg(role: 'user' | 'assistant', content: string, emotion?: EmotionType): Message {
  return { id: crypto.randomUUID(), role, content, timestamp: new Date(), emotion };
}

function mkConvo(): Conversation {
  return { id: crypto.randomUUID(), title: 'New Chat', updatedAt: new Date().toISOString() };
}

// ── Persistence ───────────────────────────────────────────────
interface Store { convos: Conversation[]; msgs: Record<string, Message[]> }

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { convos: [], msgs: {} };
    const p = JSON.parse(raw) as Store;
    for (const id in p.msgs)
      p.msgs[id] = p.msgs[id].map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    return p;
  } catch { return { convos: [], msgs: {} }; }
}

function saveStore(s: Store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota exceeded */ }
}

// ══════════════════════════════════════════════════════════════
export function useChat() {
  const { settings } = useSettings();
  const { user }     = useAuth();

  const [convos,       setConvos]       = useState<Conversation[]>([]);
  const [allMsgs,      setAllMsgs]      = useState<Record<string, Message[]>>({});
  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [typing,       setTyping]       = useState(false);
  const [loaded,       setLoaded]       = useState(false);
  const [currentEmotion, setEmotion]    = useState<EmotionType>('happy');
  const [mascotState,  setMascot]       = useState<MascotState>('idle');
  const [isOffline,    setIsOffline]    = useState(false);
  const [lastCodeTool, setLastCodeTool] = useState<CodeTool | null>(null);

  const abortRef   = useRef<AbortController | null>(null);
  const allMsgsRef = useRef(allMsgs);
  useEffect(() => { allMsgsRef.current = allMsgs; }, [allMsgs]);

  // ── Network detection ──────────────────────────────────────
  useEffect(() => {
    const online  = () => { setIsOffline(false); setMascot('idle'); };
    const offline = () => { setIsOffline(true);  setMascot('offline'); };
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);
    if (!navigator.onLine) offline();
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  // ── Hydrate from localStorage ──────────────────────────────
  useEffect(() => {
    const { convos: c, msgs: m } = loadStore();
    if (c.length > 0) {
      setConvos(c); setAllMsgs(m); setActiveId(c[0].id);
    } else {
      const c0 = mkConvo();
      setConvos([c0]); setAllMsgs({ [c0.id]: [mkMsg('assistant', GREETING, 'happy')] }); setActiveId(c0.id);
    }
    setLoaded(true);
  }, []);

  // ── Persist on change ──────────────────────────────────────
  useEffect(() => { if (loaded) saveStore({ convos, msgs: allMsgs }); }, [convos, allMsgs, loaded]);

  const messages = activeId ? (allMsgs[activeId] || []) : [];

  // ── Conversation management ────────────────────────────────
  const newChat = useCallback(() => {
    const c = mkConvo();
    setConvos(p => [c, ...p]);
    setAllMsgs(p => ({ ...p, [c.id]: [mkMsg('assistant', GREETING, 'happy')] }));
    setActiveId(c.id); setEmotion('happy'); setMascot('idle');
  }, []);

  const selectConvo = useCallback((id: string) => {
    setActiveId(id);
    const last = [...(allMsgsRef.current[id] || [])].reverse().find(m => m.role === 'assistant');
    if (last?.emotion) setEmotion(last.emotion);
  }, []);

  const renameConvo = useCallback((id: string, title: string) => {
    setConvos(p => p.map(c => c.id === id ? { ...c, title: title.trim().slice(0, 80) } : c));
  }, []);

  const deleteConvo = useCallback((id: string) => {
    setConvos(prev => {
      const rest = prev.filter(c => c.id !== id);
      setAllMsgs(p => { const n = { ...p }; delete n[id]; return n; });
      if (id === activeId) {
        if (rest.length) {
          setActiveId(rest[0].id);
        } else {
          const c = mkConvo();
          setAllMsgs(p => ({ ...p, [c.id]: [mkMsg('assistant', GREETING, 'happy')] }));
          setActiveId(c.id);
          return [c];
        }
      }
      return rest;
    });
  }, [activeId]);

  const stop = useCallback(() => {
    abortRef.current?.abort(); abortRef.current = null;
    setTyping(false); setMascot('idle');
  }, []);

  // ── Send ───────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing || !activeId) return;
    if (trimmed.length > 8000) { toast.error('Message too long (max 8000 chars)'); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const convId   = activeId;
    const userMsg  = mkMsg('user', trimmed);
    const asstId   = crypto.randomUUID();
    const history  = (allMsgsRef.current[convId] || []).slice(-12).map(m => ({ role: m.role, content: m.content }));

    setAllMsgs(p => ({ ...p, [convId]: [...(p[convId] || []), userMsg, { id: asstId, role: 'assistant', content: '', timestamp: new Date() }] }));
    setTyping(true); setMascot('listening');
    setTimeout(() => { if (!ctrl.signal.aborted) setMascot('thinking'); }, 350);

    // Auto-title new chats
    setConvos(p => p.map(c => c.id === convId && c.title === 'New Chat'
      ? { ...c, title: trimmed.slice(0, 45), updatedAt: new Date().toISOString() } : c));

    let full = '', done = false;
    let emotion: EmotionType = 'neutral', attachedTool: CodeTool | undefined, fromCache = false;

    await streamChat({
      message: trimmed, conversationId: convId,
      characterId: settings.character, userId: user?.id || 'anonymous',
      history, offlineMode: isOffline, signal: ctrl.signal,

      onEmotion:  (e) => { emotion = e; setEmotion(e); },
      onCacheHit: () => { fromCache = true; toast.success('⚡ Instant answer!', { duration: 1800 }); },
      onTool:     (t) => { attachedTool = t; setLastCodeTool(t); },

      onChunk: (chunk) => {
        if (done) return;
        full += chunk;
        const cur = full;
        setAllMsgs(p => ({ ...p, [convId]: (p[convId] || []).map(m => m.id === asstId ? { ...m, content: cur } : m) }));
      },

      onDone: () => {
        if (done) return; done = true;
        setTyping(false); setMascot('idle'); abortRef.current = null;
        setAllMsgs(p => ({ ...p, [convId]: (p[convId] || []).map(m =>
          m.id === asstId ? { ...m, content: full, emotion, tool: attachedTool, fromCache } : m) }));
        if (settings.voiceEnabled && full) speak(full, settings.voicePreset, settings.voiceRate, settings.voicePitch);
      },

      onError: (err) => {
        if (done) return; done = true;
        setTyping(false); abortRef.current = null;
        const networkErr = /fetch|network|failed to/i.test(err);
        if (networkErr) { setIsOffline(true); setMascot('offline'); } else setMascot('idle');
        setAllMsgs(p => ({ ...p, [convId]: (p[convId] || []).filter(m => m.id !== asstId).concat(mkMsg('assistant', `❌ ${err}`, 'worried')) }));
        toast.error(err);
      },
    });
  }, [typing, activeId, settings, user, isOffline]);

  return {
    messages, typing, send, stop, loaded,
    convos, activeId, newChat, selectConvo, renameConvo, deleteConvo,
    currentEmotion, mascotState, isOfflineMode: isOffline, lastCodeTool,
  };
}
