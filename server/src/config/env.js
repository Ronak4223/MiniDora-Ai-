/**
 * MiniDora — Environment Validation (Zod)
 *
 * Validates all env vars at import time.
 * On failure: prints a clear error table and calls process.exit(1).
 *
 * All fields with defaults are optional in practice — the system
 * degrades gracefully tier-by-tier without them.
 */

import 'dotenv/config';
import { z } from 'zod';

// ── Helper: coerce string → number with default ───────────────
const numStr = (def) =>
  z.string().default(String(def)).transform(Number).pipe(z.number().finite());

// ── Schema ─────────────────────────────────────────────────────
const schema = z.object({
  // Tier 1 — vLLM primary inference
  VLLM_URL:   z.string().url().default('http://localhost:8000'),
  VLLM_MODEL: z.string().default('mistralai/Mistral-7B-Instruct-v0.2'),

  // Tier 2 — Ollama local fallback
  OLLAMA_FALLBACK_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL:        z.string().default('llama3.2'),

  // Tier 3 — OpenRouter external fallback
  OPENROUTER_API_KEY: z.string().default('sk-or-placeholder-not-set'),
  OPENROUTER_MODEL:   z.string().default('meta-llama/llama-3.1-8b-instruct:free'),

  // Budget cap for Tier 3 (USD/month)
  MONTHLY_BUDGET_LIMIT: numStr(10),

  // Redis — cache + memory
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Observability — optional
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().default('https://cloud.langfuse.com'),

  // Legacy Gemini (Tier 3 fallback when OpenRouter not configured)
  GEMINI_API_KEYS: z.string().optional(),
  GEMINI_API_KEY:  z.string().optional(),
  GEMINI_MODEL:    z.string().default('gemini-2.0-flash'),

  // MongoDB — optional
  MONGODB_URI: z.string().url().optional(),
  MONGODB_DB:  z.string().default('minidora'),

  // Server
  PORT:            numStr(3001),
  NODE_ENV:        z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN:   z.string().optional(),
});

// ── Parse & validate ────────────────────────────────────────
function validate() {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  ✗  ${i.path.join('.')} — ${i.message}`)
      .join('\n');

    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌  MiniDora: Environment validation failed');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(issues);
    console.error('\n  → Copy .env.example to server/.env and fill in values.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }

  return result.data;
}

export const env = validate();
export default env;
