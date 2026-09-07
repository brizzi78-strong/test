# Cardinal Chat

A self-hosted, ChatGPT-style AI chat app you own end to end — powered by
Anthropic's Claude (`claude-opus-5`, currently a stronger model than what free
ChatGPT tiers serve). No accounts, no data leaving your server except the
model API calls, and conversations stay in your own browser.

## Why this instead of ChatGPT

- **A frontier model** — replies come from Claude Opus 5 with a server-side
  fallback to Claude Opus 4.8, so benign requests that trip a safety
  classifier still get answered.
- **Private by construction** — the server is a thin streaming proxy;
  conversation history lives in the browser's localStorage, not a vendor's
  account system.
- **Yours to shape** — a persistent "Persona" (system prompt) setting lets you
  make the assistant a tutor, an editor, a rubber duck — anything.
- **No build step, no framework** — plain Node 22 + TypeScript and a single
  self-contained HTML page with streaming markdown rendering, saved
  conversations, and dark/light themes.

## Run it

```sh
cd chat
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start     # http://localhost:4700
```

Get an API key at https://platform.claude.com. Without a key the UI still
loads and requests return a clear "no key configured" message.

- `PORT` — listen port (default 4700)
- `npm test` — endpoint tests (no API key needed)
- `npm run typecheck` — TypeScript check

## Deploy to Render

The repo's `render.yaml` blueprint includes a `cardinal-chat` service
(`deploy/Dockerfile.chat`). In the Render dashboard: **New + → Blueprint →
connect this repo → Apply**, and set two secrets when prompted:

- `ANTHROPIC_API_KEY` — from https://platform.claude.com
- `CHAT_PASSWORD` — the Basic-auth password (username defaults to `admin`
  via `CHAT_USER`)

The password gate protects every route except `/health`. Keep it on for any
public URL — whoever can reach the app spends your API budget.

## How it works

| Piece | File |
|---|---|
| Entry point | `src/index.ts` |
| HTTP server + SSE streaming proxy | `src/api/server.ts` |
| Claude API wrapper (model, fallback) | `src/api/claude.ts` |
| Chat UI (single page, no dependencies) | `src/web/index.html` |

`POST /api/chat` takes `{messages, system?}` and streams back Server-Sent
Events (`{type:"text"}` deltas, then `{type:"done"}` with token usage).
The browser renders deltas live through a small built-in markdown renderer.

## Honest scope

This is a ChatGPT-*alternative* front end on the Claude API — it does not
train or host its own model. What "better" buys you here: a top-tier model,
full privacy and control, and zero subscription (you pay per-token API usage
instead).
