/**
 * Invest UI server — a backend-for-frontend over the Trading service, with
 * real multi-user auth.
 *
 * - `GET /`             → the self-contained Invest single-page app
 * - `GET /health`       → liveness
 * - `POST /auth/signup` → create a user (name, email, password); opens a
 *                         fresh Trading account for them and starts a session
 * - `POST /auth/login`  → verify credentials, start a session
 * - `POST /auth/logout` → end the session
 * - `GET /api/app`      → the logged-in user's { accountId, accountName, email, cashCents }
 * - `/api/*`            → proxied to the Trading service, server-side —
 *                         and always scoped to the session's own account
 *
 * Sessions are opaque random tokens in an HttpOnly cookie, stored (and
 * expired) server-side; passwords are scrypt-hashed. The browser never sees
 * a Trading account id it doesn't own being honored: account-scoped paths
 * are rewritten to the session's account, order lookups are ownership-
 * checked, and everything not on the allowlist is a 404. Set
 * `INVEST_DB=/path/to.db` so users and sessions survive restarts.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { PAGE } from '../ui/page.ts';
import {
  authStoreFromEnv,
  hashPassword,
  newSessionToken,
  verifyPassword,
  type AuthStore,
  type User,
} from '../auth/store.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  tradingBase?: string;
  /** Starting buying power for each new signup (Trading defaults to $10,000). */
  startingCashCents?: number;
  authStore?: AuthStore;
  fetchImpl?: typeof fetch;
}

const SESSION_COOKIE = 'invest_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function createApp(opts: AppOptions = {}): AppServer {
  const base = (opts.tradingBase ?? process.env.TRADING_URL ?? 'http://trading:4900').replace(/\/$/, '');
  const startingCashCents = opts.startingCashCents ?? numFromEnv(process.env.STARTING_CASH_CENTS);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const store = opts.authStore ?? authStoreFromEnv();

  async function upstream(method: string, path: string, body?: unknown): Promise<any> {
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

  function sessionUser(req: IncomingMessage): User | undefined {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return undefined;
    const session = store.getSession(token);
    if (!session) return undefined;
    return store.getUser(session.userId);
  }

  function startSession(res: ServerResponse, userId: string): void {
    const token = newSessionToken();
    store.putSession({ token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
    res.setHeader(
      'set-cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    );
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      const path = url.pathname;

      if (method === 'GET' && (path === '/' || path === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      if (method === 'GET' && path === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }

      // --- auth ---------------------------------------------------------
      if (method === 'POST' && path === '/auth/signup') {
        const body = asObject(await readJson(req));
        const name = requireString(body.name, 'name');
        const email = requireString(body.email, 'email').toLowerCase();
        const password = requireString(body.password, 'password');
        if (!EMAIL_RE.test(email)) return sendError(res, 400, 'validation', 'enter a valid email address');
        if (password.length < MIN_PASSWORD_LENGTH) {
          return sendError(res, 400, 'validation', `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }
        if (store.getUserByEmail(email)) {
          return sendError(res, 409, 'conflict', 'an account with that email already exists');
        }
        const account = await upstream('POST', '/accounts', { name, startingCashCents });
        const user: User = {
          id: `user_${randomUUID()}`,
          name,
          email,
          passwordHash: hashPassword(password),
          accountId: String(account.id),
          createdAt: new Date().toISOString(),
        };
        store.putUser(user);
        startSession(res, user.id);
        return sendJson(res, 201, { ok: true });
      }
      if (method === 'POST' && path === '/auth/login') {
        const body = asObject(await readJson(req));
        const email = requireString(body.email, 'email').toLowerCase();
        const password = requireString(body.password, 'password');
        const user = store.getUserByEmail(email);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return sendError(res, 401, 'unauthorized', 'wrong email or password');
        }
        startSession(res, user.id);
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'POST' && path === '/auth/logout') {
        const token = readCookie(req, SESSION_COOKIE);
        if (token) store.deleteSession(token);
        res.setHeader('set-cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
        return sendJson(res, 200, { ok: true });
      }

      // --- app API (session required) -------------------------------------
      if (path === '/api/app' || path.startsWith('/api/')) {
        const user = sessionUser(req);
        if (!user) return sendError(res, 401, 'unauthorized', 'log in to continue');

        if (method === 'GET' && path === '/api/app') {
          const account = await upstream('GET', `/accounts/${encodeURIComponent(user.accountId)}`);
          return sendJson(res, 200, {
            accountId: user.accountId,
            accountName: user.name,
            email: user.email,
            cashCents: account.cashCents,
          });
        }

        await scopedProxy(base, fetchImpl, upstream, req, res, url, user.accountId);
        return;
      }

      sendError(res, 404, 'not_found', 'not found');
    } catch (err) {
      if (err instanceof RequestError) {
        if (!res.headersSent) sendError(res, err.status, err.code, err.message);
        else res.end();
        return;
      }
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) {
        sendError(res, 502, 'upstream', `trading service unreachable: ${message}`);
      } else {
        res.end();
      }
    }
  });

  return { server };
}

/**
 * Proxy an `/api/*` call to Trading, forced into the session's account:
 *   - account-scoped paths (`portfolio`, `watchlist`, `realized-pnl`,
 *     `accounts/:id`) have their account segment replaced outright;
 *   - `/orders` lists are filtered to the account and `POST /orders` bodies
 *     are stamped with it;
 *   - order-by-id reads/cancels are ownership-checked first (foreign → 404);
 *   - read-only market data passes through; anything else is a 404.
 */
async function scopedProxy(
  base: string,
  fetchImpl: typeof fetch,
  upstream: (method: string, path: string, body?: unknown) => Promise<any>,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  accountId: string,
): Promise<void> {
  const method = req.method ?? 'GET';
  const segments = url.pathname.slice('/api'.length).split('/').filter((s) => s.length > 0);
  const query = url.searchParams;
  let body: string | undefined;

  const acct = encodeURIComponent(accountId);
  let upstreamPath: string | undefined;

  const [head, second, third] = segments.map((s) => decodeURIComponent(s));

  if (method === 'GET' && (head === 'instruments' || head === 'quotes' || head === 'meta')) {
    upstreamPath = '/' + segments.join('/');
  } else if (method === 'GET' && head === 'portfolio' && segments.length === 2) {
    upstreamPath = `/portfolio/${acct}`;
  } else if (method === 'GET' && head === 'realized-pnl' && segments.length === 2) {
    upstreamPath = `/realized-pnl/${acct}`;
  } else if (method === 'GET' && head === 'accounts' && segments.length === 2) {
    upstreamPath = `/accounts/${acct}`;
  } else if (head === 'watchlist' && segments.length === 2 && (method === 'GET' || method === 'POST')) {
    upstreamPath = `/watchlist/${acct}`;
    if (method === 'POST') body = await readRaw(req);
  } else if (method === 'DELETE' && head === 'watchlist' && segments.length === 3) {
    upstreamPath = `/watchlist/${acct}/${encodeURIComponent(third)}`;
  } else if (head === 'orders' && segments.length === 1) {
    if (method === 'GET') {
      query.set('accountId', accountId);
      upstreamPath = '/orders';
    } else if (method === 'POST') {
      const parsed = asObject(await readJson(req));
      parsed.accountId = accountId;
      body = JSON.stringify(parsed);
      upstreamPath = '/orders';
    }
  } else if (head === 'orders' && segments.length >= 2) {
    const orderId = second;
    const isGet = method === 'GET' && segments.length === 2;
    const isCancel = method === 'POST' && segments.length === 3 && third === 'cancel';
    if (isGet || isCancel) {
      let order: any;
      try {
        order = await upstream('GET', `/orders/${encodeURIComponent(orderId)}`);
      } catch {
        order = undefined;
      }
      if (!order || order.accountId !== accountId) {
        return sendError(res, 404, 'not_found', `Order not found: ${orderId}`);
      }
      upstreamPath = '/' + segments.join('/');
      if (isCancel) body = await readRaw(req);
    }
  }

  if (!upstreamPath) {
    return sendError(res, 404, 'not_found', 'route not found');
  }

  const search = query.toString();
  const target = `${base}${upstreamPath}${search ? `?${search}` : ''}`;
  const upstreamRes = await fetchImpl(target, {
    method,
    headers: { 'content-type': 'application/json' },
    body,
  });
  const text = await upstreamRes.text();
  res.writeHead(upstreamRes.status, { 'content-type': 'application/json' });
  res.end(text);
}

// --- small helpers ----------------------------------------------------------

class RequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function numFromEnv(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function readRaw(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const raw = await readRaw(req);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, 'validation', 'request body is not valid JSON');
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError(400, 'validation', 'request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RequestError(400, 'validation', `${field} is required`);
  }
  return value.trim();
}

function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (typeof header !== 'string') return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, code: string, message: string): void {
  sendJson(res, status, { error: { code, message } });
}
