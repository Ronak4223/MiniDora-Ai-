/**
 * MiniDora v2 — Server Entry Point
 *
 * Startup order (strict):
 *  1. Env validation  — exits on bad config
 *  2. Redis cache
 *  3. Memory layer
 *  4. Observability
 *  5. MongoDB (optional)
 *  6. HTTP server
 */

import { env } from './config/env.js';                              // validates first

import express           from 'express';
import cors              from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync }    from 'fs';

import { initCache, disconnectCache, isCacheReady } from './services/cache.js';
import { initMemory }                                from './services/memory.js';
import { initObservability, getStats }               from './services/observability.js';
import { getBreakerStatus }                          from './services/fallbackChain.js';
import { connectDB }                                 from '../config/db.js';

import chatRouter          from './routes/chat.js';
import conversationsRouter from '../routes/conversations.js';
import usersRouter         from '../routes/users.js';
import charactersRouter    from '../routes/characters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PROD = env.NODE_ENV === 'production';

// ── Resilient process guards ──────────────────────────────────
process.on('unhandledRejection', (r) => console.error('[UnhandledRejection]', r));
process.on('uncaughtException',  (e) => console.error('[UncaughtException]', e.stack || e));

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: env.CLIENT_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '4mb' }));

if (!PROD) {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api') && req.method !== 'OPTIONS')
      console.log(`  ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────
app.use('/api/chat',          chatRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/users',         usersRouter);
app.use('/api/characters',    charactersRouter);

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const orOk = env.OPENROUTER_API_KEY &&
    !env.OPENROUTER_API_KEY.startsWith('sk-or-placeholder') &&
    env.OPENROUTER_API_KEY.length > 15;
  const geminiKeys = (env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '')
    .split(',').map(k => k.trim()).filter(Boolean).length;

  res.json({
    ok: true, version: '2.0.0',
    env: PROD ? 'production' : 'development',
    uptime: Math.round(process.uptime()),
    redis: isCacheReady(),
    circuitBreakers: getBreakerStatus(),
    stats: getStats(),
    tiers: {
      vllm:       env.VLLM_URL,
      ollama:     `${env.OLLAMA_FALLBACK_URL} (${env.OLLAMA_MODEL})`,
      openrouter: orOk ? env.OPENROUTER_MODEL : (geminiKeys ? `gemini (${geminiKeys} keys)` : 'not configured'),
    },
  });
});

// ── Static client (production) ────────────────────────────────
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (PROD && existsSync(clientDist)) {
  const { default: serveStatic } = await import('serve-static');
  app.use(serveStatic(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

// ── 404 + global error ────────────────────────────────────────
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ServerError]', err);
  if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
});

// ═══════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════
async function start() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖  MiniDora v2 — starting up');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.stdout.write('   Redis cache     → '); await initCache();
  process.stdout.write('   Memory layer    → '); await initMemory();
  process.stdout.write('   Observability   → '); await initObservability();
  process.stdout.write('   MongoDB         → '); await connectDB();

  const server = app.listen(env.PORT, () => {
    const orOk = env.OPENROUTER_API_KEY &&
      !env.OPENROUTER_API_KEY.startsWith('sk-or-placeholder');
    const geminiKeys = (env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '')
      .split(',').filter(Boolean).length;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅  http://localhost:${env.PORT}`);
    console.log(`    Tier 1  vLLM        ${env.VLLM_URL}`);
    console.log(`    Tier 2  Ollama      ${env.OLLAMA_FALLBACK_URL}`);
    console.log(`    Tier 3  External    ${orOk ? 'OpenRouter ✓' : geminiKeys ? `Gemini (${geminiKeys} keys) ✓` : '⚠ not configured'}`);
    console.log(`    Tier 4  Offline     always available`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  async function shutdown(sig) {
    console.log(`\n[${sig}] shutting down…`);
    server.close(async () => {
      await disconnectCache().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch(err => { console.error('[FATAL]', err); process.exit(1); });
