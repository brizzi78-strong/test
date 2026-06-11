# Human + AI Writing Tool

A small web app where **you** write the draft and **Claude** helps you refine it.
Paste a draft, pick what you want done, and watch the rewrite stream back in
real time — side by side with your original.

![mode chips: Humanize · Improve · Fix grammar · Make it shorter · Expand · Adjust tone](https://img.shields.io/badge/modes-6-7c9cff)

## What it does

Six one-click modes:

| Mode | What Claude does |
| --- | --- |
| **Humanize** | Strips robotic, AI-sounding phrasing and gives the text a natural human voice |
| **Improve** | Tightens prose, sharpens word choice, fixes awkward flow |
| **Fix grammar** | Corrects grammar/spelling/punctuation only — voice untouched |
| **Make it shorter** | Cuts redundancy and filler while keeping the meaning |
| **Expand** | Develops the ideas with relevant detail and examples |
| **Adjust tone** | Rewrites in a tone you choose (professional, friendly, persuasive, …) |

Other niceties: streaming output, **Copy**, **Use as draft** (feed the result
back in for another pass), character count, and `⌘/Ctrl + Enter` to run.

## Architecture

- **Backend** — Node + Express (`server.js`). One streaming endpoint
  (`POST /api/rewrite`) proxies to the Claude API via the official
  [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript)
  and relays tokens to the browser over Server-Sent Events. The API key stays on
  the server and is never exposed to the client.
- **Frontend** — plain HTML/CSS/JS in `public/`, no build step.
- **Model** — `claude-opus-4-8` by default (override with `ANTHROPIC_MODEL`).

## Run it

Requires Node.js 18+.

```bash
# 1. Install dependencies
npm install

# 2. Add your Anthropic API key
cp .env.example .env
#   then edit .env and paste your key

# 3. Start the server
npm start
```

Open <http://localhost:3000>.

> `npm run dev` starts the server with `--watch` for auto-reload during
> development.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | **Required.** Your Anthropic API key |
| `PORT` | `3000` | Port the server listens on |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` | Claude model to use |

## License

MIT
