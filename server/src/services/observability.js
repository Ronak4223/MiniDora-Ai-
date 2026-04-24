/**
 * MiniDora — Observability Service
 *
 * Always collects in-process stats (zero deps).
 * Optionally sends to Langfuse if keys are configured.
 *
 * Exports:
 *   initObservability()
 *   startTrace({ userId, prompt, sessionId }) → { success, failure, cacheHit }
 *   getStats() → stats snapshot
 */

import { env } from '../config/env.js';

let langfuse = null;

// ── In-memory stats (always collected) ───────────────────────
const stats = {
  totalCalls:   0,
  successCalls: 0,
  failureCalls: 0,
  cacheHits:    0,
  latencySum:   0,
  avgLatencyMs: 0,
  tierUsage: {
    tier1_vllm:        0,
    tier2_ollama:      0,
    tier3_openrouter:  0,
    tier4_offline:     0,
  },
};

function recordCall({ success, tier, latencyMs, cacheHit = false }) {
  stats.totalCalls++;
  if (success) stats.successCalls++; else stats.failureCalls++;
  if (cacheHit) stats.cacheHits++;
  if (tier && tier in stats.tierUsage) stats.tierUsage[tier]++;
  if (latencyMs > 0) {
    stats.latencySum += latencyMs;
    stats.avgLatencyMs = Math.round(stats.latencySum / stats.totalCalls);
  }
}

// ── Init ──────────────────────────────────────────────────────
export async function initObservability() {
  if (env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY) {
    try {
      const { Langfuse } = await import('langfuse');
      langfuse = new Langfuse({
        publicKey:  env.LANGFUSE_PUBLIC_KEY,
        secretKey:  env.LANGFUSE_SECRET_KEY,
        baseUrl:    env.LANGFUSE_HOST,
        flushAt:    10,
        flushInterval: 5000,
      });
      console.log('✅ Langfuse active');
    } catch (err) {
      console.log(`⚪ Langfuse failed (${err.message}) — local stats only`);
    }
  } else {
    console.log('⚪ local stats (add LANGFUSE keys to enable tracing)');
  }
}

// ── Trace factory ─────────────────────────────────────────────
export function startTrace({ userId = 'anon', prompt = '', sessionId = null } = {}) {
  const t0 = Date.now();
  let lTrace = null;

  if (langfuse) {
    try {
      lTrace = langfuse.trace({
        name: 'minidora-chat',
        userId,
        sessionId: sessionId || userId,
        input: prompt.slice(0, 500),
      });
    } catch { /* non-fatal */ }
  }

  return {
    async success({ model = 'unknown', tier = 'unknown', output = '' } = {}) {
      const ms = Date.now() - t0;
      recordCall({ success: true, tier, latencyMs: ms });
      console.log(`[obs] ✅ ${tier} | ${model} | ${ms}ms`);
      if (lTrace) {
        try {
          lTrace.generation({ name: 'completion', model, input: prompt.slice(0, 300), output: output.slice(0, 500), metadata: { tier, ms }, endTime: new Date() });
          await langfuse.flushAsync().catch(() => {});
        } catch { /* non-fatal */ }
      }
    },

    async failure({ model = 'unknown', tier = 'unknown', error = '' } = {}) {
      const ms = Date.now() - t0;
      recordCall({ success: false, tier, latencyMs: ms });
      console.warn(`[obs] ❌ ${tier} | ${model} | ${ms}ms | ${error}`);
      if (lTrace) {
        try {
          lTrace.update({ output: `ERROR: ${error}`, metadata: { tier, ms, error }, level: 'ERROR' });
          await langfuse.flushAsync().catch(() => {});
        } catch { /* non-fatal */ }
      }
    },

    cacheHit() {
      const ms = Date.now() - t0;
      recordCall({ success: true, tier: null, latencyMs: ms, cacheHit: true });
      console.log(`[obs] ⚡ CACHE HIT | ${ms}ms`);
    },
  };
}

export function getStats() {
  return { ...stats, tierUsage: { ...stats.tierUsage } };
}

export default { initObservability, startTrace, getStats };
