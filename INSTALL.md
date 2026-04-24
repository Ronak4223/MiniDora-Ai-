# MiniDora v2 — Installation Guide

Everything you need to get MiniDora running, from zero to chatting in under 5 minutes.

---

## What you need (minimum)

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18 or newer | `node --version` |
| npm | 9 or newer | `npm --version` |

That's it. Everything else is optional and adds more AI capability.

---

## Step 1 — Install dependencies

Open a terminal in the project root folder (`minidora-upgraded/`):

```bash
npm run install:all
```

This installs both the server and client packages in one command (~1 min).

---

## Step 2 — Configure environment

```bash
cp .env.example server/.env
```

Open `server/.env` in any text editor. The defaults work out of the box — you don't *need* to change anything. MiniDora will use the offline personality engine (Tier 4) until you connect a real AI.

---

## Step 3 — Start the app

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) together.

Open your browser at: **http://localhost:5173**

You should see the MiniDora login screen. Click **"Try Demo"** to skip account creation and start chatting immediately.

---

## That's it — you're running ✅

MiniDora works right now with the built-in offline AI (Tier 4). It's not GPT-4, but it's MiniDora's personality — decent for a first run.

---

## Add real AI (optional but recommended)

Each step below adds a new AI tier. They stack — MiniDora tries them in order and falls back automatically.

---

### Option A — Ollama (free, local, no API key)

Best for: privacy, offline use, no cost ever.
Needs: 8 GB RAM minimum (16 GB recommended).

**1. Install Ollama**

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download installer from https://ollama.com/download
```

**2. Download a model**

```bash
ollama pull llama3.2
```

(~2 GB download, takes a few minutes)

**3. Start Ollama**

```bash
ollama serve
```

Leave this running in a terminal. MiniDora will automatically detect it on `localhost:11434`.

**4. No config change needed** — `OLLAMA_FALLBACK_URL` already points to `localhost:11434` in `.env.example`.

---

### Option B — OpenRouter (free tier, no GPU needed)

Best for: cloud AI without a credit card, or when you don't have 8 GB RAM spare.

**1. Create a free account** at https://openrouter.ai

**2. Go to** https://openrouter.ai/keys and create an API key.

**3. Open `server/.env`** and set:

```env
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

The `free` suffix means the model is zero-cost (rate-limited but generous).

**4. Restart the server** — it picks up env changes on restart.

---

### Option C — Gemini (Google, free tier)

Use this if you already have Gemini API keys from a previous MiniDora setup.

**1. Get keys** at https://aistudio.google.com/apikey (free, no credit card).

**2. Open `server/.env`** and set:

```env
GEMINI_API_KEYS=key1,key2,key3
GEMINI_MODEL=gemini-2.0-flash
```

Multiple keys rotate automatically when one hits rate limits.

**Note:** Gemini is used as a fallback *within* Tier 3, only when OpenRouter is not configured.

---

### Option D — vLLM (advanced, GPU server)

For teams running their own inference server.

```env
VLLM_URL=http://your-gpu-server:8000
VLLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

MiniDora tries this first before everything else.

---

## Add Redis cache + memory (optional, strongly recommended)

Without Redis, cache and memory fall back to a local JSON file — still works, just slower.

**Docker (easiest):**

```bash
docker run -d --name minidora-redis -p 6379:6379 redis:alpine
```

**Or use Upstash (free cloud Redis, no Docker):**

1. Go to https://upstash.com and create a free Redis database
2. Copy the `redis://` connection URL
3. Set in `server/.env`:

```env
REDIS_URL=redis://your-upstash-url-here
```

---

## Add MongoDB (optional — for chat history persistence)

Without MongoDB, chat history is stored in the browser's localStorage only (lost if you clear browser data).

**Docker:**

```bash
docker run -d --name minidora-mongo -p 27017:27017 mongo:7
```

Set in `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=minidora
```

**Or use MongoDB Atlas free tier:** https://cloud.mongodb.com

---

## Full recommended setup (all optional services)

Run this block to start everything at once:

```bash
# Redis
docker run -d --name minidora-redis -p 6379:6379 redis:alpine

# MongoDB
docker run -d --name minidora-mongo -p 27017:27017 mongo:7

# Ollama
ollama pull llama3.2 && ollama serve &

# MiniDora
npm run dev
```

---

## Check everything is working

Open: **http://localhost:3001/api/health**

You should see something like:

```json
{
  "ok": true,
  "redis": true,
  "tiers": {
    "vllm": "http://localhost:8000",
    "ollama": "http://localhost:11434 (llama3.2)",
    "openrouter": "meta-llama/llama-3.1-8b-instruct:free"
  },
  "circuitBreakers": {
    "vllm":   { "open": false },
    "ollama": { "open": false },
    "tier3":  { "open": false }
  }
}
```

`"open": false` means the circuit is healthy. If a tier's circuit is `"open": true`, that tier failed 3 times and is temporarily bypassed — it will retry after 30 seconds.

---

## Troubleshooting

**"Port 3001 already in use"**
```bash
# Find and kill the process using 3001
lsof -ti:3001 | xargs kill -9
```

**"Cannot connect to Ollama"**
```bash
# Make sure Ollama is running
ollama list       # shows downloaded models
ollama serve      # starts the server
```

**"Redis connection refused"**
```bash
# Check if Docker container is running
docker ps | grep redis
# Start it if stopped
docker start minidora-redis
```

**Chat works but AI responses are just the offline engine**
- Check `http://localhost:3001/api/health` — look at the `circuitBreakers` section
- If a breaker is `open`, wait 30 seconds and try again
- Check your API keys in `server/.env` are correct (no extra spaces)

**Vite dev server shows blank page**
```bash
cd client && npm run dev
# Wait for "Local: http://localhost:5173/" before opening browser
```

**"Module not found" errors on server start**
```bash
# Dependencies might not be installed
npm run install:all
```

---

## Environment variables reference

Full list of all supported variables in `server/.env`:

```env
# ── AI Tiers ──────────────────────────────────────────────────

# Tier 1: vLLM (your own GPU inference server)
VLLM_URL=http://localhost:8000
VLLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2

# Tier 2: Ollama (local free AI)
OLLAMA_FALLBACK_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Tier 3: OpenRouter (cloud free tier)
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
MONTHLY_BUDGET_LIMIT=10

# Tier 3 (alternative): Gemini keys (comma-separated)
GEMINI_API_KEYS=key1,key2,key3
GEMINI_MODEL=gemini-2.0-flash

# ── Infrastructure ─────────────────────────────────────────────

# Redis (cache + memory)
REDIS_URL=redis://localhost:6379

# MongoDB (persistent chat history)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=minidora

# ── Observability ──────────────────────────────────────────────

# Langfuse (optional AI tracing — https://cloud.langfuse.com)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# ── Server ──────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173   # set to your frontend URL in production
```

---

## Production deployment

**Build the frontend:**
```bash
cd client && npm run build
# Built files land in client/dist/
```

**Set environment for production:**
```env
NODE_ENV=production
CLIENT_ORIGIN=https://your-domain.com
```

The server automatically serves `client/dist/` when `NODE_ENV=production`.

**Start production server:**
```bash
cd server && npm start
# Runs: node src/index.js
```

**Recommended: use PM2 for process management:**
```bash
npm install -g pm2
pm2 start "node server/src/index.js" --name minidora
pm2 save
pm2 startup
```

---

## Quick command reference

```bash
npm run dev           # Start both server + client (development)
npm run start         # Start server only (production)
npm run build         # Build client for production
npm run install:all   # Install all dependencies

# Server only
cd server && npm run dev    # Server with hot-reload
cd server && npm start      # Server production mode

# Client only
cd client && npm run dev    # Client dev server (port 5173)
cd client && npm run build  # Build for production
```
