# 🤖 MiniDora v2 — Hybrid Local-First AI Agent

A resilient AI chat system with 4-tier fallback, streaming, semantic cache, memory, and live code preview.

## Architecture

```
Browser  →  React (SSE streaming + MascotAvatar + LivePreview)
          ↓
Express  →  POST /api/chat  (SSE stream)
          ↓
Agent    →  Memory injection + Tool parsing
          ↓
 ├─ Redis Semantic Cache  (SHA-256, 1h TTL)
 ├─ Circuit Breakers      (Opossum, 3 fails → open)
 ↓
Tier 1  vLLM        localhost:8000      25s timeout
Tier 2  Ollama      localhost:11434     local GPU/CPU
Tier 3  OpenRouter  api.openrouter.ai   or Gemini fallback
Tier 4  Offline     always works        personality engine
```

## Quick Start

```bash
# 1. Install
npm run install:all        # root — installs server + client

# 2. Configure
cp .env.example server/.env
# edit server/.env — at minimum no changes needed, Tier 4 always works

# 3. Optional: local AI (free, no API key)
brew install ollama && ollama pull llama3.2 && ollama serve

# 4. Optional: Redis cache + memory
docker run -d -p 6379:6379 redis:alpine

# 5. Run
npm run dev                # starts both server (3001) + client (5173)
```

The app works immediately with zero configuration — Tier 4 offline engine runs always.

## Tiers

| Tier | Service | Setup |
|------|---------|-------|
| 1 | **vLLM** | GPU server. Set `VLLM_URL` in `.env` |
| 2 | **Ollama** | `ollama pull llama3.2 && ollama serve` |
| 3 | **OpenRouter** | Set `OPENROUTER_API_KEY` (free tier available) |
| 3b | **Gemini** | Set `GEMINI_API_KEYS` (used if OpenRouter not set) |
| 4 | **Offline** | Built-in. Always active. |

Circuit breakers open after 3 consecutive failures, retry after 30s.

## API

```
POST /api/chat         SSE stream (message → token chunks)
GET  /api/health       system status, all tier configs
GET  /api/chat/status  circuit breaker state + call stats
GET  /api/characters   character list (12 personalities)
```

## SSE Packet Types

```js
{ type: 'emotion', emotion: 'happy' }           // pre-response emotion
{ type: 'cache_hit' }                            // instant cached answer
{ type: 'tool', tool: { type, title, code } }   // code generation payload
{ choices: [{ delta: { content: '...' } }] }     // text chunk
[DONE]                                           // stream complete
```

## Agent Tools

**`generateWebsiteCode`** — triggered by "build me a website/app/form..."
→ AI generates complete HTML/CSS/JS, rendered in sandboxed iframe

**`rememberFact`** — triggered by "remember that...", "don't forget..."
→ Stored in Redis (30-day TTL) or local `data/memory.json`, injected into future prompts

## Environment Variables

See `.env.example` for all variables with descriptions.
Minimum required: none (defaults work, Tier 4 always runs).

## Project Structure

```
server/
  src/
    config/env.js           Zod env validation
    services/cache.js       Redis semantic cache
    services/memory.js      User fact storage
    services/fallbackChain.js  4-tier circuit breaker
    services/observability.js  Langfuse + in-process stats
    agent/index.js          Prompt builder + tool parser
    routes/chat.js          SSE endpoint
    index.js                Server entry point
  config/
    characters.js           12 AI personalities
    offline-engine.js       Tier 4 response bank
    db.js                   MongoDB (optional)
  models/                   Mongoose schemas
  routes/                   conversations, users, characters

client/src/
  components/chat/
    MascotAvatar.tsx        State-driven avatar (idle/listening/thinking/offline)
    LivePreview.tsx         Sandboxed iframe code runner
    ChatBubble.tsx          Message with cache badge + emoji + preview
    ChatHeader.tsx          Header with live mascot state
    ...
  hooks/useChat.ts          SSE streaming + state machine
  lib/api.ts                SSE client + REST helpers
  lib/emoji-engine.ts       Sprite sheet emoji selection
  lib/voice.ts              Browser TTS
```
