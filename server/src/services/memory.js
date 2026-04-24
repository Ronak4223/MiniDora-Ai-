/**
 * MiniDora — Memory System
 *
 * Stores user facts across sessions.
 * Primary:  Redis  (key: minidora:mem:<userId>, 30-day TTL)
 * Fallback: data/memory.json  (local JSON file)
 *
 * Exports:
 *   initMemory()
 *   storeFact(userId, fact)
 *   getMemories(userId) → string[]
 *   buildMemoryContext(userId) → string  (inject into system prompt)
 *   clearMemories(userId)
 *   extractFactsFromMessage(text) → string[]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from 'redis';
import { env } from '../config/env.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = join(__dirname, '..', '..', 'data');
const MEM_FILE   = join(DATA_DIR, 'memory.json');
const MEM_PREFIX = 'minidora:mem:';
const MAX_FACTS  = 30;
const MEM_TTL    = 60 * 60 * 24 * 30; // 30 days

let redis  = null;
let useRedis = false;

// ── Local JSON helpers ────────────────────────────────────────
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readLocal() {
  try {
    if (existsSync(MEM_FILE)) return JSON.parse(readFileSync(MEM_FILE, 'utf8'));
  } catch { /* corrupt — reset */ }
  return {};
}

function writeLocal(store) {
  try { ensureDir(); writeFileSync(MEM_FILE, JSON.stringify(store, null, 2)); }
  catch (e) { console.warn('[memory] Local write failed:', e.message); }
}

// ── Init ──────────────────────────────────────────────────────
export async function initMemory() {
  ensureDir();
  try {
    redis = createClient({
      url: env.REDIS_URL,
      socket: { connectTimeout: 5000, reconnectStrategy: (n) => Math.min(n * 200, 3000) },
    });
    redis.on('error', () => {}); // suppress repeated errors — already warned at init
    await redis.connect();
    useRedis = true;
    console.log('✅ Redis');
  } catch {
    redis = null;
    useRedis = false;
    console.log('⚪ local JSON fallback');
  }
}

// ── Store a fact ──────────────────────────────────────────────
export async function storeFact(userId, fact) {
  if (!fact || typeof fact !== 'string') return;
  const clean = fact.trim().slice(0, 300);
  if (!clean) return;

  if (useRedis && redis) {
    try {
      const key = MEM_PREFIX + userId;
      await redis.lPush(key, clean);
      await redis.lTrim(key, 0, MAX_FACTS - 1);
      await redis.expire(key, MEM_TTL);
      return;
    } catch (e) {
      console.warn('[memory] Redis store failed, using local:', e.message);
    }
  }

  // Local fallback
  const store = readLocal();
  if (!Array.isArray(store[userId])) store[userId] = [];
  store[userId].unshift(clean);
  store[userId] = store[userId].slice(0, MAX_FACTS);
  writeLocal(store);
}

// ── Retrieve facts ────────────────────────────────────────────
export async function getMemories(userId) {
  if (useRedis && redis) {
    try {
      return await redis.lRange(MEM_PREFIX + userId, 0, MAX_FACTS - 1);
    } catch (e) {
      console.warn('[memory] Redis get failed, using local:', e.message);
    }
  }
  return readLocal()[userId] || [];
}

// ── Build context string for system prompt ────────────────────
export async function buildMemoryContext(userId) {
  const facts = await getMemories(userId);
  if (!facts.length) return '';

  const lines = facts
    .slice(0, 10)
    .map((f, i) => `  ${i + 1}. ${f}`)
    .join('\n');

  return `\n\n═══ THINGS I REMEMBER ABOUT YOU ═══\n${lines}\n\nUse these naturally — don't announce them awkwardly.`;
}

// ── Clear all memories for a user ─────────────────────────────
export async function clearMemories(userId) {
  if (useRedis && redis) {
    try { await redis.del(MEM_PREFIX + userId); } catch { /* ignore */ }
  }
  const store = readLocal();
  delete store[userId];
  writeLocal(store);
}

// ── Auto-extract facts from user messages ─────────────────────
export function extractFactsFromMessage(msg) {
  const facts = [];
  if (!msg || typeof msg !== 'string') return facts;

  // Name
  const nameM = msg.match(/\b(?:my name is|i(?:'m| am) called|call me)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
  if (nameM) facts.push(`User's name is ${nameM[1].trim()}`);

  // Location
  const locM = msg.match(/\b(?:i(?:'m| am) from|i live in|i(?:'m| am) based in)\s+([A-Za-z][a-zA-Z\s]{2,40}?)(?:\.|,|!|\?|$)/i);
  if (locM) facts.push(`User is from ${locM[1].trim()}`);

  // Job / role
  const jobM = msg.match(/\b(?:i(?:'m| am)(?: a| an)?|i work as(?: a| an)?)\s+(developer|designer|teacher|student|engineer|doctor|writer|artist|manager|analyst|nurse|lawyer|architect|chef|entrepreneur)\b/i);
  if (jobM) facts.push(`User works as a ${jobM[1].toLowerCase()}`);

  // Explicit remember request
  const remM = msg.match(/\b(?:remember that|don't forget|note that|please remember)\s+(.{10,200}?)(?:\.|$)/i);
  if (remM) facts.push(remM[1].trim());

  return facts;
}

export default { initMemory, storeFact, getMemories, buildMemoryContext, clearMemories, extractFactsFromMessage };
