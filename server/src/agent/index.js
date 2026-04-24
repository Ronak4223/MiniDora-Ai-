/**
 * MiniDora v2 — Agent Core
 *
 * 1. Resolve character system prompt
 * 2. Inject memory context
 * 3. Detect intent (code / memory)
 * 4. Build messages array
 * 5. Stream through fallback chain
 * 6. Parse & execute tool calls
 * 7. Auto-extract user facts
 */

import { runFallbackChain }                                              from '../services/fallbackChain.js';
import { buildMemoryContext, storeFact, extractFactsFromMessage }        from '../services/memory.js';
import { getCharacter }                                                  from '../../config/characters.js';

// ── Intent patterns ───────────────────────────────────────────
const CODE_RE = /\b(build|create|generate|make|write|code)\s+(me\s+)?(a\s+)?(website|webpage|landing\s*page|portfolio|app|application|component|form|calculator|game|timer|dashboard|ui|interface)\b|\b(html|css|javascript|js)\s+(code|snippet|template|example|for)\b/i;
const MEM_RE  = /\b(remember|don't forget|please remember|note that|keep in mind|save this)\b/i;

// ── Tool tag parser ───────────────────────────────────────────
function parseTools(text) {
  const tools = [];

  const cm = text.match(/<tool:generateWebsiteCode>([\s\S]*?)<\/tool:generateWebsiteCode>/);
  if (cm) {
    const block = cm[1];
    const tM = block.match(/^title:\s*(.+)$/m);
    const dM = block.match(/^description:\s*(.+)$/m);
    let code = block;
    if (dM) code = block.slice(block.indexOf(dM[0]) + dM[0].length).trim();
    else if (tM) code = block.slice(block.indexOf(tM[0]) + tM[0].length).trim();
    tools.push({ type: 'generateWebsiteCode', title: tM?.[1]?.trim() || 'Generated Page', description: dM?.[1]?.trim() || '', code });
  }

  const mm = text.match(/<tool:rememberFact>([\s\S]*?)<\/tool:rememberFact>/);
  if (mm) tools.push({ type: 'rememberFact', fact: mm[1].trim() });

  return tools;
}

function stripTools(text) {
  return text
    .replace(/<tool:generateWebsiteCode>[\s\S]*?<\/tool:generateWebsiteCode>/g, '')
    .replace(/<tool:rememberFact>[\s\S]*?<\/tool:rememberFact>/g, '')
    .trim();
}

// ── Stream filter — buffers open tags, flushes visible text ──
function makeStreamFilter() {
  let buf = '';
  return (chunk) => {
    buf += chunk;
    if (buf.includes('<tool:') && !buf.includes('</tool:')) return '';  // mid-tag — hold
    const out = buf
      .replace(/<tool:generateWebsiteCode>[\s\S]*?<\/tool:generateWebsiteCode>/g, '')
      .replace(/<tool:rememberFact>[\s\S]*?<\/tool:rememberFact>/g, '');
    buf = '';
    return out;
  };
}

// ══════════════════════════════════════════════════════════════
// runAgent
// ══════════════════════════════════════════════════════════════
export async function runAgent({ message, history = [], characterId = 'minidora', userId = 'anonymous', onChunk = () => {}, signal = null }) {
  // 1. System prompt
  let systemPrompt;
  try { systemPrompt = getCharacter(characterId).systemPrompt; }
  catch { systemPrompt = getCharacter('minidora').systemPrompt; }

  // 2. Memory injection
  systemPrompt += await buildMemoryContext(userId);

  // 3. Intent hints
  if (CODE_RE.test(message))
    systemPrompt += '\n\n[HINT: User wants code. Use generateWebsiteCode tool. Write complete, self-contained, runnable HTML/CSS/JS.]';
  if (MEM_RE.test(message))
    systemPrompt += '\n\n[HINT: User wants you to remember something. Confirm warmly and use rememberFact tool.]';

  // 4. Messages
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 4000) })),
    { role: 'user', content: message.trim() },
  ];

  // 5. Stream
  let raw = '';
  const filter = makeStreamFilter();
  const { text, tier, model } = await runFallbackChain(messages, message, (chunk) => {
    raw += chunk;
    const visible = filter(chunk);
    if (visible) onChunk(visible);
  }, signal);

  // 6. Parse tools + side effects
  const full  = raw || text;
  const tools = parseTools(full);
  for (const t of tools)
    if (t.type === 'rememberFact' && t.fact)
      await storeFact(userId, t.fact).catch(e => console.warn('[agent] storeFact:', e.message));

  // 7. Auto-extract user facts
  for (const fact of extractFactsFromMessage(message))
    await storeFact(userId, fact).catch(() => {});

  return { text: full, cleanText: stripTools(full), tier, model, tools };
}

export default { runAgent };
