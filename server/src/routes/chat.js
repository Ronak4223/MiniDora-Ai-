/**
 * MiniDora v2 — SSE Chat Route
 *
 * POST /api/chat        → SSE stream
 * GET  /api/chat/status → circuit-breakers + stats
 * GET  /api/chat/messages/:id → conversation history
 */

import express from 'express';
import { detectEmotion }             from '../../config/offline-engine.js';
import { cacheGet, cacheSet }        from '../services/cache.js';
import { runAgent }                  from '../agent/index.js';
import { startTrace, getStats }      from '../services/observability.js';
import { getBreakerStatus }          from '../services/fallbackChain.js';
import Message                       from '../../models/Message.js';
import Conversation                  from '../../models/Conversation.js';
import { dbReady }                   from '../../config/db.js';

const router = express.Router();

// ── In-memory rate limiter ────────────────────────────────────
const rl = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of rl) if (now > v.r) rl.delete(k); }, 300_000);

function rateLimit(ip) {
  const now = Date.now();
  const e = rl.get(ip) || { n: 0, r: now + 60_000 };
  if (now > e.r) { e.n = 0; e.r = now + 60_000; }
  rl.set(ip, { n: ++e.n, r: e.r });
  return e.n <= 60;
}

// ── SSE write helpers ─────────────────────────────────────────
function sseWrite(res, data) {
  try { if (!res.writableEnded && !res.destroyed) { res.write(`data: ${JSON.stringify(data)}\n\n`); return true; } }
  catch { /* client left */ }
  return false;
}

function sseDone(res) {
  try {
    if (!res.writableEnded && !res.destroyed) res.write('data: [DONE]\n\n');
    if (!res.writableEnded) res.end();
  } catch { /* ignore */ }
}

// ── Persist to DB (fire-and-forget) ──────────────────────────
function persistToDb({ conversationId, userId, userMsg, assistantMsg, tier, characterId, fromCache }) {
  if (!dbReady() || !assistantMsg || !conversationId) return;
  setImmediate(async () => {
    try {
      const ts  = Date.now();
      const src = tier + (fromCache ? '+cache' : '');
      await Message.insertMany([
        { messageId: `${conversationId}_u_${ts}`,   conversationId, userId, role: 'user',      content: userMsg,      characterId, provider: src, timestamp: new Date(ts)     },
        { messageId: `${conversationId}_a_${ts+1}`, conversationId, userId, role: 'assistant', content: assistantMsg, characterId, provider: src, timestamp: new Date(ts + 1) },
      ]);
      await Conversation.findOneAndUpdate(
        { conversationId },
        { $set: { updatedAt: new Date(), characterId }, $inc: { messageCount: 2 } }
      );
    } catch (e) { console.error('[DB]', e.message); }
  });
}

// ═══════════════════════════════════════════════════════════════
// POST /api/chat
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests — slow down!' });

  const {
    message, conversationId,
    characterId = 'minidora',
    userId      = 'anonymous',
    history     = [],
    offlineMode = false,
  } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim())
    return res.status(400).json({ error: 'message is required' });

  const trimmed = message.trim();
  if (trimmed.length > 8000)
    return res.status(400).json({ error: 'Message too long (max 8000 chars)' });

  // SSE headers
  res.setHeader('Content-Type',       'text/event-stream');
  res.setHeader('Cache-Control',      'no-cache');
  res.setHeader('Connection',         'keep-alive');
  res.setHeader('X-Accel-Buffering',  'no');
  res.flushHeaders();

  const abort = new AbortController();
  req.on('close', () => abort.abort());

  const trace = startTrace({ userId, prompt: trimmed });

  // Emit emotion signal immediately (fast, local)
  sseWrite(res, { type: 'emotion', emotion: detectEmotion(trimmed) });

  let replyText = '', tier = 'tier4_offline', model = 'offline-engine';
  let tools = [], fromCache = false;

  try {
    // ── 1. Semantic cache lookup ────────────────────────────
    if (!offlineMode) {
      const cached = await cacheGet(trimmed);
      if (cached) {
        fromCache = true;
        trace.cacheHit();
        sseWrite(res, { type: 'cache_hit' });

        for (const word of cached.text.split(' ')) {
          if (abort.signal.aborted) break;
          sseWrite(res, { choices: [{ delta: { content: word + ' ' } }] });
          await new Promise(r => setTimeout(r, 14));
        }
        for (const tool of (cached.tools || []))
          sseWrite(res, { type: 'tool', tool });

        replyText = cached.text; tier = cached.tier; tools = cached.tools || [];
        sseDone(res);
        persistToDb({ conversationId, userId, userMsg: trimmed, assistantMsg: replyText, tier, characterId, fromCache });
        return;
      }
    }

    // ── 2. Agent (memory → fallback chain → tools) ──────────
    const result = await runAgent({
      message: trimmed, history, characterId, userId,
      signal: abort.signal,
      onChunk: (chunk) => sseWrite(res, { choices: [{ delta: { content: chunk } }] }),
    });

    replyText = result.cleanText || result.text;
    tier      = result.tier;
    model     = result.model;
    tools     = result.tools || [];

    for (const tool of tools) sseWrite(res, { type: 'tool', tool });

    // ── 3. Cache successful non-offline responses ────────────
    if (tier !== 'tier4_offline' && replyText)
      await cacheSet(trimmed, { text: replyText, tier, model, tools, cachedAt: Date.now() });

    await trace.success({ model, tier, output: replyText });

  } catch (err) {
    if (abort.signal.aborted) return;
    console.error('[chat]', err.message);
    await trace.failure({ model, tier, error: err.message });
    const fallback = "My circuits hiccupped! 😅 Still here — try again in a moment?";
    sseWrite(res, { choices: [{ delta: { content: fallback } }] });
    replyText = fallback;
  }

  sseDone(res);
  persistToDb({ conversationId, userId, userMsg: trimmed, assistantMsg: replyText, tier, characterId, fromCache });
});

// ── GET /api/chat/messages/:id ────────────────────────────────
router.get('/messages/:conversationId', async (req, res) => {
  if (!dbReady()) return res.json({ messages: [], source: 'no-db' });
  try {
    const messages = await Message
      .find({ conversationId: req.params.conversationId })
      .sort({ timestamp: 1 }).limit(200)
      .select('messageId role content characterId provider timestamp -_id')
      .lean();
    res.json({ messages, source: 'mongodb' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/chat/status ──────────────────────────────────────
router.get('/status', (_req, res) => res.json({
  ok: true,
  circuitBreakers: getBreakerStatus(),
  stats: getStats(),
  timestamp: new Date().toISOString(),
}));

// Legacy compat
router.get('/keys/status', (_req, res) =>
  res.json({ message: 'v2: use /api/chat/status', circuitBreakers: getBreakerStatus() })
);

export default router;
