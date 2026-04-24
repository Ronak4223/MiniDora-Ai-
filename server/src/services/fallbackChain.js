/**
 * MiniDora — Fallback Chain with Circuit Breakers
 *
 * Tier 1: vLLM         (OpenAI-compatible, 25s timeout)
 * Tier 2: Ollama       (local, newline-JSON streaming)
 * Tier 3: OpenRouter   (cloud, budget-tracked) OR Gemini (legacy keys)
 * Tier 4: Offline      (personality engine — always works)
 *
 * Circuit breakers (Opossum):
 *   - Opens after 3 consecutive failures
 *   - Half-opens after 30 seconds to retry
 */

import CircuitBreaker from 'opossum';
import axios from 'axios';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { getOfflineResponse, getFallbackResponse } from '../../config/offline-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '..', '..', 'data');
const USAGE_FILE = join(DATA_DIR, 'usage.json');

// ── Ensure data directory ─────────────────────────────────────
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── Monthly usage tracking ────────────────────────────────────
function loadUsage() {
  try {
    if (existsSync(USAGE_FILE)) {
      const d = JSON.parse(readFileSync(USAGE_FILE, 'utf8'));
      const now = new Date();
      const key = `${now.getFullYear()}-${now.getMonth()}`;
      if (d.month === key) return d;
    }
  } catch { /* corrupt */ }
  const now = new Date();
  return { month: `${now.getFullYear()}-${now.getMonth()}`, spent: 0, calls: 0 };
}

function addUsage(costUsd = 0) {
  const u = loadUsage();
  u.spent = +(u.spent + costUsd).toFixed(6);
  u.calls += 1;
  try { writeFileSync(USAGE_FILE, JSON.stringify(u, null, 2)); } catch { /* ignore */ }
  return u;
}

function budgetExceeded() {
  return loadUsage().spent >= env.MONTHLY_BUDGET_LIMIT;
}

// ── Shared breaker config ─────────────────────────────────────
const BREAKER_BASE = {
  errorThresholdPercentage: 50,
  volumeThreshold:          3,
  resetTimeout:             30_000,
};

// ── SSE / OpenAI-compatible stream reader ─────────────────────
async function readOpenAIStream(axiosStream, onChunk, signal) {
  return new Promise((resolve, reject) => {
    let full = '';
    let buf  = '';

    signal?.addEventListener('abort', () => {
      axiosStream.data.destroy();
      resolve(full);
    });

    axiosStream.data.on('data', (chunk) => {
      if (signal?.aborted) return;
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const obj  = JSON.parse(json);
          const text = obj.choices?.[0]?.delta?.content
            ?? obj.choices?.[0]?.text
            ?? '';
          if (text) { full += text; onChunk(text); }
        } catch { /* skip malformed chunk */ }
      }
    });

    axiosStream.data.on('end',   () => resolve(full));
    axiosStream.data.on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════
// TIER 1 — vLLM
// ═══════════════════════════════════════════════════════════════
async function _vllm(messages, onChunk, signal) {
  const res = await axios.post(
    `${env.VLLM_URL}/v1/chat/completions`,
    { model: env.VLLM_MODEL, messages, stream: true, max_tokens: 1500, temperature: 0.85 },
    { responseType: 'stream', timeout: 25_000, signal }
  );
  return readOpenAIStream(res, onChunk, signal);
}

const vllmBreaker = new CircuitBreaker(_vllm, { ...BREAKER_BASE, timeout: 25_000, name: 'vllm' });
vllmBreaker.on('open',     () => console.warn('[circuit] vLLM  OPEN  → Ollama'));
vllmBreaker.on('halfOpen', () => console.log('[circuit] vLLM  HALF-OPEN'));
vllmBreaker.on('close',    () => console.log('[circuit] vLLM  CLOSED ✓'));

// ═══════════════════════════════════════════════════════════════
// TIER 2 — Ollama  (newline-delimited JSON stream)
// ═══════════════════════════════════════════════════════════════
async function _ollama(messages, onChunk, signal) {
  const res = await axios.post(
    `${env.OLLAMA_FALLBACK_URL}/api/chat`,
    { model: env.OLLAMA_MODEL, messages, stream: true, options: { temperature: 0.85, num_predict: 1500 } },
    { responseType: 'stream', timeout: 60_000, signal }
  );

  return new Promise((resolve, reject) => {
    let full = '';
    let buf  = '';

    signal?.addEventListener('abort', () => { res.data.destroy(); resolve(full); });

    res.data.on('data', (chunk) => {
      if (signal?.aborted) return;
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const obj  = JSON.parse(line);
          const text = obj.message?.content || '';
          if (text) { full += text; onChunk(text); }
          if (obj.done) { resolve(full); return; }
        } catch { /* skip */ }
      }
    });

    res.data.on('end',   () => resolve(full));
    res.data.on('error', reject);
  });
}

const ollamaBreaker = new CircuitBreaker(_ollama, { ...BREAKER_BASE, timeout: 60_000, name: 'ollama' });
ollamaBreaker.on('open',  () => console.warn('[circuit] Ollama OPEN  → OpenRouter'));
ollamaBreaker.on('close', () => console.log('[circuit] Ollama CLOSED ✓'));

// ═══════════════════════════════════════════════════════════════
// TIER 3a — OpenRouter
// ═══════════════════════════════════════════════════════════════
async function _openRouter(messages, onChunk, signal) {
  if (budgetExceeded()) throw Object.assign(new Error('Budget exceeded'), { code: 'BUDGET' });

  const key = env.OPENROUTER_API_KEY;
  const isPlaceholder = !key || key.startsWith('sk-or-placeholder') || key.length < 20;
  if (isPlaceholder) throw Object.assign(new Error('OpenRouter not configured'), { code: 'NOT_CONFIGURED' });

  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: env.OPENROUTER_MODEL, messages, stream: true, max_tokens: 1200 },
    {
      responseType: 'stream',
      timeout: 25_000,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://minidora.app',
        'X-Title': 'MiniDora AI',
      },
      signal,
    }
  );

  addUsage(0.0001); // rough estimate
  return readOpenAIStream(res, onChunk, signal);
}

// ═══════════════════════════════════════════════════════════════
// TIER 3b — Gemini (legacy key rotation, no OpenRouter)
// ═══════════════════════════════════════════════════════════════
async function _gemini(messages, onChunk, signal) {
  const keys = (env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '')
    .split(',').map(k => k.trim()).filter(Boolean);

  if (!keys.length) throw new Error('No Gemini keys configured');

  let lastErr;
  for (const key of keys) {
    try {
      let system = null;
      let msgs   = messages;
      if (messages[0]?.role === 'system') {
        system = messages[0].content;
        msgs   = messages.slice(1);
      }

      const contents = msgs.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const body = {
        contents,
        generationConfig: { maxOutputTokens: 1500, temperature: 0.85 },
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;
      const res = await axios.post(url, body, { responseType: 'stream', timeout: 30_000, signal });

      return await new Promise((resolve, reject) => {
        let full = '';
        let buf  = '';
        res.data.on('data', chunk => {
          buf += chunk.toString();
          let nl;
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json || json === '[DONE]') continue;
            try {
              const obj  = JSON.parse(json);
              const text = obj.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) { full += text; onChunk(text); }
            } catch { /* skip */ }
          }
        });
        res.data.on('end',   () => resolve(full));
        res.data.on('error', reject);
        signal?.addEventListener('abort', () => { res.data.destroy(); resolve(full); });
      });
    } catch (err) {
      lastErr = err;
      if (err.response?.status === 401 || err.response?.status === 403) continue; // try next key
      if (err.response?.status === 429) continue; // rate limited — try next key
      throw err; // unknown error — stop
    }
  }
  throw lastErr || new Error('All Gemini keys failed');
}

// Combined Tier 3 with fallback order: OpenRouter → Gemini
async function _tier3(messages, onChunk, signal) {
  try {
    return await _openRouter(messages, onChunk, signal);
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED' || err.code === 'BUDGET') {
      // Try Gemini instead
      return await _gemini(messages, onChunk, signal);
    }
    throw err;
  }
}

const tier3Breaker = new CircuitBreaker(_tier3, { ...BREAKER_BASE, timeout: 30_000, name: 'tier3' });
tier3Breaker.on('open',  () => console.warn('[circuit] Tier3  OPEN  → Offline'));
tier3Breaker.on('close', () => console.log('[circuit] Tier3  CLOSED ✓'));

// ═══════════════════════════════════════════════════════════════
// TIER 4 — Offline personality engine (no network, always works)
// ═══════════════════════════════════════════════════════════════
async function runOffline(userMessage, onChunk, signal) {
  const { text } = getOfflineResponse(userMessage);
  let full = '';
  for (const word of text.split(' ')) {
    if (signal?.aborted) break;
    await new Promise(r => setTimeout(r, 18 + Math.random() * 22));
    const chunk = word + ' ';
    full += chunk;
    onChunk(chunk);
  }
  return full;
}

// ═══════════════════════════════════════════════════════════════
// MAIN — try tiers in order
// ═══════════════════════════════════════════════════════════════
/**
 * runFallbackChain(messages, userMessage, onChunk, signal)
 * → { text, tier, model }
 */
export async function runFallbackChain(messages, userMessage, onChunk, signal) {
  // Tier 1 — vLLM
  if (!vllmBreaker.opened) {
    try {
      const text = await vllmBreaker.fire(messages, onChunk, signal);
      return { text, tier: 'tier1_vllm', model: env.VLLM_MODEL };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn('[fallback] Tier 1 failed:', err.message);
    }
  }

  // Tier 2 — Ollama
  if (!ollamaBreaker.opened) {
    try {
      const text = await ollamaBreaker.fire(messages, onChunk, signal);
      return { text, tier: 'tier2_ollama', model: env.OLLAMA_MODEL };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn('[fallback] Tier 2 failed:', err.message);
    }
  }

  // Tier 3 — OpenRouter / Gemini
  if (!tier3Breaker.opened) {
    try {
      const text = await tier3Breaker.fire(messages, onChunk, signal);
      const model = env.OPENROUTER_API_KEY && !env.OPENROUTER_API_KEY.startsWith('sk-or-placeholder')
        ? env.OPENROUTER_MODEL
        : env.GEMINI_MODEL;
      return { text, tier: 'tier3_openrouter', model };
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn('[fallback] Tier 3 failed:', err.message);
    }
  }

  // Tier 4 — Offline (guaranteed)
  console.log('[fallback] Tier 4: offline engine');
  const text = await runOffline(userMessage, onChunk, signal);
  return { text, tier: 'tier4_offline', model: 'offline-engine' };
}

export function getBreakerStatus() {
  return {
    vllm:   { open: vllmBreaker.opened,   halfOpen: vllmBreaker.halfOpen },
    ollama: { open: ollamaBreaker.opened, halfOpen: ollamaBreaker.halfOpen },
    tier3:  { open: tier3Breaker.opened,  halfOpen: tier3Breaker.halfOpen },
  };
}

export default { runFallbackChain, getBreakerStatus };
