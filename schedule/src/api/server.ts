/**
 * Schedule UI server — a backend-for-frontend over the Booking service.
 *
 * - `GET /`        → the self-contained schedule single-page app
 * - `GET /health`  → liveness
 * - `/api/*`       → transparently proxied to the Booking service, server-side,
 *                    so the browser holds no credentials and there's no CORS.
 *
 * The proxy is generic: `/api/appointments?…` → `<bookingBase>/appointments?…`.
 * An optional gateway API key is attached here and never reaches the browser.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PAGE } from '../ui/page.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  bookingBase?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const bookingBase = (opts.bookingBase ?? process.env.BOOKING_URL ?? 'http://booking:4100').replace(/\/$/, '');
  const apiKey = opts.apiKey ?? process.env.GATEWAY_API_KEY;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const server = createServer(makeListener(bookingBase, apiKey, fetchImpl));
  return { server };
}

function makeListener(bookingBase: string, apiKey: string | undefined, fetchImpl: typeof fetch) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';

      if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      if (method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (url.pathname.startsWith('/api/')) {
        await proxy(bookingBase, apiKey, fetchImpl, req, res, url);
        return;
      }

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'not_found', message: 'not found' } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'upstream', message: `booking unreachable: ${message}` } }));
      } else {
        res.end();
      }
    }
  };
}

async function proxy(
  bookingBase: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const upstreamPath = url.pathname.slice('/api'.length); // "/api/appointments" → "/appointments"
  const target = `${bookingBase}${upstreamPath}${url.search}`;
  const method = req.method ?? 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRaw(req);
  const upstream = await fetchImpl(target, { method, headers, body });
  const text = await upstream.text();
  res.writeHead(upstream.status, { 'content-type': 'application/json' });
  res.end(text);
}

async function readRaw(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined;
}
