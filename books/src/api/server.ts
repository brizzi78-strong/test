/**
 * Cardinal Books UI server — a backend-for-frontend over the Accounting service.
 *
 * - `GET /`         → the self-contained Cardinal Books single-page app
 * - `GET /health`   → liveness
 * - `GET /api/app`  → the configured business { companyId, businessName }
 * - `/api/*`        → transparently proxied to the Accounting service,
 *                     server-side, so the browser holds no credentials.
 *
 * On first use it ensures the business exists in Accounting and seeds a default
 * chart of accounts (once), so a fresh deployment opens to a usable, empty set
 * of books for one company (Blue Ridge Press LLC by default). Point it at a
 * real, persistent Accounting instance and the data is real and durable.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PAGE } from '../ui/page.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  accountingBase?: string;
  businessName?: string;
  /** Existing company id to use; when unset, one is created on first use. */
  companyId?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

interface Primary {
  companyId: string;
  businessName: string;
}

const DEFAULT_ACCOUNTS: ReadonlyArray<[string, string, string]> = [
  ['income', 'Consulting Revenue', '4000'],
  ['income', 'Retainers', '4100'],
  ['expense', 'Software', '6000'],
  ['expense', 'Contractors', '6100'],
  ['expense', 'Office', '6200'],
];

export function createApp(opts: AppOptions = {}): AppServer {
  const base = (opts.accountingBase ?? process.env.ACCOUNTING_URL ?? 'http://accounting:4400').replace(/\/$/, '');
  const businessName = opts.businessName ?? process.env.BUSINESS_NAME ?? 'Blue Ridge Press LLC';
  const configuredId = opts.companyId ?? process.env.BUSINESS_COMPANY_ID;
  const apiKey = opts.apiKey ?? process.env.GATEWAY_API_KEY;
  const fetchImpl = opts.fetchImpl ?? fetch;

  // Per-server memoized bootstrap so we create the company / seed accounts once.
  let primary: Primary | undefined;
  let ensuring: Promise<Primary> | undefined;

  async function call(method: string, path: string, body?: unknown): Promise<any> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (res.status >= 300) {
      const message = (json && json.error && json.error.message) || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return json;
  }

  async function ensurePrimary(): Promise<Primary> {
    if (primary) return primary;
    if (!ensuring) {
      ensuring = (async () => {
        let companyId = configuredId;
        if (!companyId) {
          const co = await call('POST', '/companies', { name: businessName });
          companyId = String(co.id);
        }
        const accounts = await call('GET', `/accounts?companyId=${encodeURIComponent(companyId)}`);
        if (Array.isArray(accounts) && accounts.length === 0) {
          for (const [type, name, code] of DEFAULT_ACCOUNTS) {
            await call('POST', '/accounts', { companyId, type, name, code });
          }
        }
        primary = { companyId, businessName };
        return primary;
      })();
    }
    return ensuring;
  }

  const server = createServer(makeListener(base, apiKey, fetchImpl, ensurePrimary));
  return { server };
}

function makeListener(
  base: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
  ensurePrimary: () => Promise<Primary>,
) {
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
        return sendJson(res, 200, { status: 'ok' });
      }
      if (method === 'GET' && url.pathname === '/api/app') {
        const primary = await ensurePrimary();
        return sendJson(res, 200, primary);
      }
      if (url.pathname.startsWith('/api/')) {
        await proxy(base, apiKey, fetchImpl, req, res, url);
        return;
      }

      sendJson(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) {
        sendJson(res, 502, { error: { code: 'upstream', message: `accounting unreachable: ${message}` } });
      } else {
        res.end();
      }
    }
  };
}

async function proxy(
  base: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const upstreamPath = url.pathname.slice('/api'.length); // "/api/invoices" → "/invoices"
  const target = `${base}${upstreamPath}${url.search}`;
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

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
