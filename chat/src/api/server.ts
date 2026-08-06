/**
 * HTTP server: serves the single-page chat UI and proxies chat requests to
 * the Claude API as a Server-Sent-Events stream.
 *
 * Routes:
 *   GET  /            — chat UI (src/web/index.html)
 *   GET  /health      — liveness + whether an API key is configured
 *   POST /api/chat    — body {messages, system?}; responds with SSE events:
 *                       {type:"text",text} deltas, then {type:"done",...},
 *                       or {type:"error",message}
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import type Anthropic from '@anthropic-ai/sdk';
import { createClaudeClient, streamReply, MODEL, type ChatTurn } from './claude.ts';

const WEB_INDEX = new URL('../web/index.html', import.meta.url);

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  /** Injected for tests; defaults to a client built from ANTHROPIC_API_KEY. */
  client?: Anthropic | null;
}

interface ChatRequestBody {
  messages: ChatTurn[];
  system?: string;
}

function parseChatBody(raw: string): ChatRequestBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const body = parsed as { messages?: unknown; system?: unknown };
  if (!Array.isArray(body.messages) || body.messages.length === 0) return null;
  const messages: ChatTurn[] = [];
  for (const m of body.messages) {
    const turn = m as { role?: unknown; content?: unknown };
    if ((turn.role !== 'user' && turn.role !== 'assistant') || typeof turn.content !== 'string') {
      return null;
    }
    messages.push({ role: turn.role, content: turn.content });
  }
  if (messages[messages.length - 1].role !== 'user') return null;
  const system = typeof body.system === 'string' && body.system.trim() ? body.system : undefined;
  return { messages, system };
}

function readBody(req: IncomingMessage, limit = 2 * 1024 * 1024): Promise<string | null> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function sseEvent(res: ServerResponse, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function handleChat(req: IncomingMessage, res: ServerResponse, client: Anthropic | null): Promise<void> {
  if (!client) {
    sendJson(res, 503, {
      error: 'No API key configured. Set ANTHROPIC_API_KEY and restart the server.',
    });
    return;
  }
  const raw = await readBody(req);
  if (raw === null) {
    sendJson(res, 413, { error: 'Request body too large.' });
    return;
  }
  const body = parseChatBody(raw);
  if (!body) {
    sendJson(res, 400, { error: 'Expected {messages: [{role, content}...]} ending with a user turn.' });
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
  });

  try {
    const result = await streamReply(client, body, (delta) => sseEvent(res, { type: 'text', text: delta }));
    if (result.stopReason === 'refusal') {
      sseEvent(res, { type: 'error', message: 'The model declined this request.' });
    }
    sseEvent(res, {
      type: 'done',
      stopReason: result.stopReason,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
  } catch (err) {
    sseEvent(res, { type: 'error', message: err instanceof Error ? err.message : 'Upstream request failed.' });
  }
  res.end();
}

export function createApp(opts: AppOptions = {}): AppServer {
  const client = opts.client !== undefined ? opts.client : createClaudeClient();
  const indexHtml = readFileSync(WEB_INDEX, 'utf8');

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(indexHtml);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, model: MODEL, keyConfigured: client !== null });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      void handleChat(req, res, client);
      return;
    }
    sendJson(res, 404, { error: 'Not found' });
  });

  return { server };
}
