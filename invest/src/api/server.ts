/**
 * Invest UI server — a backend-for-frontend over the Trading service.
 *
 * - `GET /`         → the self-contained Invest single-page app
 * - `GET /health`   → liveness
 * - `GET /api/app`  → the configured account { accountId, accountName, cashCents }
 * - `/api/*`        → transparently proxied to the Trading service, server-side,
 *                     so the browser holds no credentials
 *
 * On first use it ensures the demo account exists in Trading (reusing one with
 * the same name across restarts against a durable store, otherwise creating
 * one with the configured starting cash), so a fresh deployment opens straight
 * into a usable paper-trading account. Point it at a real, persistent Trading
 * instance and every order is real (within the mock market) and durable.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { PAGE } from '../ui/page.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  tradingBase?: string;
  accountName?: string;
  /** Existing account id to use; when unset, one is created (or reused by name) on first use. */
  accountId?: string;
  startingCashCents?: number;
  /** Optional HTTP Basic auth gate (recommended when public); both required. */
  user?: string;
  password?: string;
  fetchImpl?: typeof fetch;
}

interface Primary {
  accountId: string;
  accountName: string;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const base = (opts.tradingBase ?? process.env.TRADING_URL ?? 'http://trading:4900').replace(/\/$/, '');
  const accountName = opts.accountName ?? process.env.ACCOUNT_NAME ?? 'Rob';
  const configuredId = opts.accountId ?? process.env.ACCOUNT_ID;
  const startingCashCents = opts.startingCashCents ?? numFromEnv(process.env.STARTING_CASH_CENTS);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const authUser = opts.user ?? process.env.INVEST_USER;
  const authPassword = opts.password ?? process.env.INVEST_PASSWORD;
  const gate = authUser && authPassword ? { user: authUser, password: authPassword } : undefined;

  // Per-server memoized bootstrap so we create the account once.
  let primary: Primary | undefined;
  let ensuring: Promise<Primary> | undefined;

  async function call(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
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
        let accountId = configuredId;
        if (!accountId) {
          const existing = await call('GET', `/accounts?name=${encodeURIComponent(accountName)}`);
          if (Array.isArray(existing) && existing.length > 0) {
            accountId = String(existing[0].id);
          } else {
            const acct = await call('POST', '/accounts', {
              name: accountName,
              startingCashCents,
            });
            accountId = String(acct.id);
          }
        }
        primary = { accountId, accountName };
        return primary;
      })();
    }
    return ensuring;
  }

  const server = createServer(makeListener(base, fetchImpl, ensurePrimary, gate));
  return { server };
}

function numFromEnv(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function makeListener(
  base: string,
  fetchImpl: typeof fetch,
  ensurePrimary: () => Promise<Primary>,
  gate: { user: string; password: string } | undefined,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';

      if (gate && url.pathname !== '/health' && !authorized(req, gate)) {
        res.writeHead(401, {
          'www-authenticate': 'Basic realm="Invest", charset="UTF-8"',
          'content-type': 'application/json',
        });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'authentication required' } }));
        return;
      }

      if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      if (method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }
      if (method === 'GET' && url.pathname === '/api/app') {
        const p = await ensurePrimary();
        const account = await proxyCall(base, fetchImpl, 'GET', `/accounts/${p.accountId}`);
        return sendJson(res, 200, { accountId: p.accountId, accountName: p.accountName, cashCents: account.cashCents });
      }
      if (url.pathname.startsWith('/api/')) {
        await proxy(base, fetchImpl, req, res, url);
        return;
      }

      sendJson(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) {
        sendJson(res, 502, { error: { code: 'upstream', message: `trading service unreachable: ${message}` } });
      } else {
        res.end();
      }
    }
  };
}

async function proxyCall(base: string, fetchImpl: typeof fetch, method: string, path: string): Promise<any> {
  const res = await fetchImpl(`${base}${path}`, { method, headers: { 'content-type': 'application/json' } });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function proxy(
  base: string,
  fetchImpl: typeof fetch,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const upstreamPath = url.pathname.slice('/api'.length); // "/api/orders" → "/orders"
  const target = `${base}${upstreamPath}${url.search}`;
  const method = req.method ?? 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  const body = method === 'GET' || method === 'HEAD' || method === 'DELETE' ? undefined : await readRaw(req);
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

/** Constant-time HTTP Basic auth check against the configured user/password. */
function authorized(req: IncomingMessage, gate: { user: string; password: string }): boolean {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  return safeEqual(user, gate.user) && safeEqual(password, gate.password);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
