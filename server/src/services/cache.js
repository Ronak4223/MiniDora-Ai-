/**
 * MiniDora — Semantic Cache (Redis)
 *
 * Flow: normalize prompt → SHA-256 hash → Redis GET/SET
 * TTL:  1 hour
 * Fail: silently degrades — system continues without cache
 *
 * Exports: initCache | cacheGet | cacheSet | cacheDelete | isCacheReady | disconnectCache
 */

import { createHash } from 'crypto';
import { createClient } from 'redis';
import { env } from '../config/env.js';

const TTL    = 3600;           // 1 hour in seconds
const PREFIX = 'minidora:c:';  // short prefix to save key space

let client    = null;
let _ready    = false;

// ── Normalize prompt for consistent hashing ──────────────────
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function makeKey(prompt) {
  return PREFIX + createHash('sha256').update(normalize(prompt)).digest('hex');
}

// ── Init ──────────────────────────────────────────────────────
export async function initCache() {
  try {
    client = createClient({
      url: env.REDIS_URL,
      socket: { connectTimeout: 5000, reconnectStrategy: (n) => Math.min(n * 200, 3000) },
    });

    client.on('error',       (e) => { if (_ready) console.warn('[cache] Redis error:', e.message); });
    client.on('reconnecting',  () => console.log('[cache] Reconnecting to Redis…'));
    client.on('ready',         () => { _ready = true; });

    await client.connect();
    _ready = true;
    console.log('✅ connected');
  } catch (err) {
    console.log(`⚪ skipped (${err.message})`);
    client = null;
    _ready = false;
  }
}

// ── Public API ────────────────────────────────────────────────
export async function cacheGet(prompt) {
  if (!_ready || !client) return null;
  try {
    const raw = await client.get(makeKey(prompt));
    if (raw) {
      console.log('[cache] HIT:', prompt.slice(0, 50));
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[cache] GET error:', e.message);
  }
  return null;
}

export async function cacheSet(prompt, data) {
  if (!_ready || !client) return;
  try {
    await client.set(makeKey(prompt), JSON.stringify(data), { EX: TTL });
  } catch (e) {
    console.warn('[cache] SET error:', e.message);
  }
}

export async function cacheDelete(prompt) {
  if (!_ready || !client) return;
  try { await client.del(makeKey(prompt)); } catch { /* ignore */ }
}

export function isCacheReady() { return _ready; }

export async function disconnectCache() {
  if (client && _ready) {
    try { await client.quit(); } catch { /* ignore */ }
    _ready = false;
    console.log('[cache] Disconnected');
  }
}

export default { initCache, cacheGet, cacheSet, cacheDelete, isCacheReady, disconnectCache };
