/**
 * Cardinal Trading UI server — a backend-for-frontend over the Trading service, with
 * real multi-user auth and the hardening a public deployment needs.
 *
 * - `GET /`             → the self-contained Cardinal Trading single-page app
 * - `GET /health`       → liveness
 * - `POST /auth/signup` → create a user (name, email, password); opens a
 *                         fresh Trading account for them and starts a session
 * - `POST /auth/login`  → verify credentials, start a session
 * - `POST /auth/logout` → end the session
 * - `GET  /auth/verify?token=` → confirm the emailed verification link
 * - `POST /auth/resend-verification` → re-send it (session required)
 * - `POST /auth/forgot` → email a single-use password-reset link (same
 *                         200 whether or not the address exists)
 * - `POST /auth/reset`  → set a new password from a reset token; logs the
 *                         user out everywhere
 * - `GET /api/app`      → the logged-in user's { accountId, accountName, email, cashCents }
 * - `/api/*`            → proxied to the Trading service, server-side —
 *                         and always scoped to the session's own account
 *
 * Sessions are opaque random tokens in an HttpOnly cookie, stored (and
 * expired) server-side; passwords are scrypt-hashed. The browser never sees
 * a Trading account id it doesn't own being honored: account-scoped paths
 * are rewritten to the session's account, order lookups are ownership-
 * checked, and everything not on the allowlist is a 404.
 *
 * Hardening on top of that:
 *   - auth endpoints are rate-limited per client IP, and repeated failed
 *     logins lock the email out for the window (cleared by a success);
 *   - state-changing requests must not carry a cross-site Origin (CSRF
 *     defense-in-depth on top of the SameSite=Lax cookie);
 *   - security headers on every response, a restrictive CSP on the page,
 *     and `Cache-Control: no-store` on everything under /auth and /api;
 *   - the session cookie gains `Secure` when INVEST_COOKIE_SECURE is set,
 *     or automatically behind a trusted proxy (INVEST_TRUST_PROXY) that
 *     reports `x-forwarded-proto: https`;
 *   - an append-only audit trail (signups, logins, failures, logouts,
 *     orders placed/cancelled) with timestamp and client IP, kept in the
 *     auth store — never exposed over HTTP.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { PAGE } from '../ui/page.ts';
import { LEGAL_PAGES } from '../ui/legal.ts';
import {
  authStoreFromEnv,
  hashPassword,
  newSessionToken,
  verifyPassword,
  type AuthStore,
  type User,
} from '../auth/store.ts';
import { createRateLimiter, type RateLimiter } from '../auth/rateLimit.ts';
import { mailerFromEnv, type Mailer } from '../auth/mailer.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  tradingBase?: string;
  /** Starting buying power for each new signup (Trading defaults to $10,000). */
  startingCashCents?: number;
  authStore?: AuthStore;
  fetchImpl?: typeof fetch;
  /** Always set the Secure flag on the session cookie. */
  secureCookies?: boolean;
  /** Trust x-forwarded-* from the reverse proxy (client IP, https detection). */
  trustProxy?: boolean;
  /** Auth abuse thresholds; overridable for tests. */
  authLimits?: { windowMs?: number; maxAttemptsPerIp?: number; maxFailuresPerEmail?: number };
  /** Where verification/reset emails go; defaults from env, console when unset. */
  mailer?: Mailer;
  /** Absolute origin used in emailed links (INVEST_BASE_URL); inferred from the request when unset. */
  baseUrl?: string;
}

const SESSION_COOKIE = 'invest_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const PAGE_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function createApp(opts: AppOptions = {}): AppServer {
  const base = (opts.tradingBase ?? process.env.TRADING_URL ?? 'http://trading:4900').replace(/\/$/, '');
  const startingCashCents = opts.startingCashCents ?? numFromEnv(process.env.STARTING_CASH_CENTS);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const store = opts.authStore ?? authStoreFromEnv();
  const secureCookies = opts.secureCookies ?? boolFromEnv(process.env.INVEST_COOKIE_SECURE);
  const trustProxy = opts.trustProxy ?? boolFromEnv(process.env.INVEST_TRUST_PROXY);
  const mailer = opts.mailer ?? mailerFromEnv();
  const configuredBaseUrl = (opts.baseUrl ?? process.env.INVEST_BASE_URL ?? '').replace(/\/$/, '');

  const windowMs = opts.authLimits?.windowMs ?? 15 * 60 * 1000;
  const ipLimiter: RateLimiter = createRateLimiter({
    windowMs,
    max: opts.authLimits?.maxAttemptsPerIp ?? 30,
  });
  const failLimiter: RateLimiter = createRateLimiter({
    windowMs,
    max: opts.authLimits?.maxFailuresPerEmail ?? 10,
  });

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

  function clientIp(req: IncomingMessage): string {
    if (trustProxy) {
      const fwd = req.headers['x-forwarded-for'];
      const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
      if (first) return first;
    }
    return req.socket.remoteAddress ?? 'unknown';
  }

  function isHttps(req: IncomingMessage): boolean {
    if (trustProxy) {
      const proto = req.headers['x-forwarded-proto'];
      if ((Array.isArray(proto) ? proto[0] : proto) === 'https') return true;
    }
    return false;
  }

  function sessionUser(req: IncomingMessage): User | undefined {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return undefined;
    const session = store.getSession(token);
    if (!session) return undefined;
    return store.getUser(session.userId);
  }

  function startSession(req: IncomingMessage, res: ServerResponse, userId: string): void {
    const token = newSessionToken();
    store.putSession({ token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
    const secure = secureCookies || isHttps(req) ? '; Secure' : '';
    res.setHeader(
      'set-cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`,
    );
  }

  function audit(req: IncomingMessage, action: string, fields: { userId?: string; email?: string; detail?: string } = {}): void {
    store.appendAudit({ at: new Date().toISOString(), action, ip: clientIp(req), ...fields });
  }

  function linkBase(req: IncomingMessage): string {
    if (configuredBaseUrl) return configuredBaseUrl;
    const proto = isHttps(req) ? 'https' : 'http';
    return `${proto}://${req.headers.host ?? 'localhost'}`;
  }

  /** Issue a single-use token and email its link; failures are logged, never fatal. */
  function sendAuthEmail(req: IncomingMessage, user: User, purpose: 'verify' | 'reset'): void {
    const token = newSessionToken();
    const ttl = purpose === 'verify' ? VERIFY_TOKEN_TTL_MS : RESET_TOKEN_TTL_MS;
    store.putEmailToken({ token, userId: user.id, purpose, expiresAt: new Date(Date.now() + ttl).toISOString() });
    const link =
      purpose === 'verify'
        ? `${linkBase(req)}/auth/verify?token=${token}`
        : `${linkBase(req)}/?reset=${token}`;
    const email =
      purpose === 'verify'
        ? {
            to: user.email,
            subject: 'Verify your Cardinal Trading email',
            text: `Hi ${user.name},\n\nConfirm this is your email address by opening:\n\n${link}\n\nThe link is good for 24 hours. If you didn't sign up for Cardinal Trading, ignore this message.`,
          }
        : {
            to: user.email,
            subject: 'Reset your Cardinal Trading password',
            text: `Hi ${user.name},\n\nSet a new password by opening:\n\n${link}\n\nThe link is good for 1 hour and can be used once. If you didn't ask for this, ignore this message — your password is unchanged.`,
          };
    mailer.send(email).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[invest] failed to send ${purpose} email to ${user.email}: ${err instanceof Error ? err.message : err}`);
    });
    audit(req, purpose === 'verify' ? 'email_verification_sent' : 'password_reset_requested', {
      userId: user.id,
      email: user.email,
    });
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      const path = url.pathname;

      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('x-frame-options', 'DENY');
      res.setHeader('referrer-policy', 'no-referrer');
      if (path.startsWith('/auth/') || path.startsWith('/api/')) {
        res.setHeader('cache-control', 'no-store');
      }

      // CSRF defense-in-depth: a state-changing request arriving with a
      // cross-site Origin is rejected outright (same-origin browsers and
      // non-browser clients pass; the SameSite=Lax cookie is the first line).
      if (method !== 'GET' && method !== 'HEAD' && !originAllowed(req)) {
        return sendError(res, 403, 'forbidden', 'cross-origin request rejected');
      }

      if (method === 'GET' && (path === '/' || path === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': PAGE_CSP });
        res.end(PAGE);
        return;
      }
      if (method === 'GET' && path === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }
      // Legal pages are public — readable before signing up.
      if (method === 'GET' && path.startsWith('/legal/')) {
        const page = LEGAL_PAGES[path.slice('/legal/'.length)];
        if (page) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': PAGE_CSP });
          res.end(page);
          return;
        }
        return sendError(res, 404, 'not_found', 'no such page');
      }

      // --- auth ---------------------------------------------------------
      const rateLimitedAuthPaths = ['/auth/signup', '/auth/login', '/auth/forgot', '/auth/resend-verification'];
      if (method === 'POST' && rateLimitedAuthPaths.includes(path)) {
        if (!ipLimiter.hit(clientIp(req))) {
          audit(req, 'auth_rate_limited');
          return sendError(res, 429, 'rate_limited', 'too many attempts — try again later');
        }
      }
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
        startSession(req, res, user.id);
        audit(req, 'signup', { userId: user.id, email });
        sendAuthEmail(req, user, 'verify');
        return sendJson(res, 201, { ok: true });
      }
      if (method === 'POST' && path === '/auth/login') {
        const body = asObject(await readJson(req));
        const email = requireString(body.email, 'email').toLowerCase();
        const password = requireString(body.password, 'password');
        if (failLimiter.count(email) >= (opts.authLimits?.maxFailuresPerEmail ?? 10)) {
          audit(req, 'login_locked', { email });
          return sendError(res, 429, 'rate_limited', 'too many failed logins — try again later');
        }
        const user = store.getUserByEmail(email);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          failLimiter.hit(email);
          audit(req, 'login_failed', { email });
          return sendError(res, 401, 'unauthorized', 'wrong email or password');
        }
        failLimiter.reset(email);
        startSession(req, res, user.id);
        audit(req, 'login', { userId: user.id, email });
        return sendJson(res, 200, { ok: true });
      }
      // Clicked from the verification email; lands the browser back on the app.
      if (method === 'GET' && path === '/auth/verify') {
        const token = url.searchParams.get('token') ?? '';
        const record = store.getEmailToken(token);
        if (!record || record.purpose !== 'verify') {
          res.writeHead(302, { location: '/?verified=invalid' });
          res.end();
          return;
        }
        store.deleteEmailToken(token);
        const user = store.getUser(record.userId);
        if (user && !user.emailVerifiedAt) {
          user.emailVerifiedAt = new Date().toISOString();
          store.putUser(user);
          audit(req, 'email_verified', { userId: user.id, email: user.email });
        }
        res.writeHead(302, { location: '/?verified=1' });
        res.end();
        return;
      }
      if (method === 'POST' && path === '/auth/resend-verification') {
        const user = sessionUser(req);
        if (!user) return sendError(res, 401, 'unauthorized', 'log in to continue');
        if (!user.emailVerifiedAt) sendAuthEmail(req, user, 'verify');
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'POST' && path === '/auth/forgot') {
        const body = asObject(await readJson(req));
        const email = requireString(body.email, 'email').toLowerCase();
        const user = store.getUserByEmail(email);
        if (user) sendAuthEmail(req, user, 'reset');
        // Same answer whether or not the email exists — don't leak accounts.
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'POST' && path === '/auth/reset') {
        const body = asObject(await readJson(req));
        const token = requireString(body.token, 'token');
        const password = requireString(body.password, 'password');
        if (password.length < MIN_PASSWORD_LENGTH) {
          return sendError(res, 400, 'validation', `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }
        const record = store.getEmailToken(token);
        if (!record || record.purpose !== 'reset') {
          return sendError(res, 400, 'validation', 'this reset link is invalid or has expired — request a new one');
        }
        const user = store.getUser(record.userId);
        if (!user) return sendError(res, 400, 'validation', 'this reset link is invalid or has expired — request a new one');
        store.deleteEmailToken(token);
        user.passwordHash = hashPassword(password);
        // Opening the emailed link proves control of the mailbox.
        if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date().toISOString();
        store.putUser(user);
        store.deleteSessionsForUser(user.id); // log out everywhere
        failLimiter.reset(user.email);
        audit(req, 'password_reset', { userId: user.id, email: user.email });
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'POST' && path === '/auth/logout') {
        const token = readCookie(req, SESSION_COOKIE);
        const user = sessionUser(req);
        if (token) store.deleteSession(token);
        res.setHeader('set-cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
        if (user) audit(req, 'logout', { userId: user.id, email: user.email });
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
            emailVerified: Boolean(user.emailVerifiedAt),
            cashCents: account.cashCents,
            // The CARD token's contract address (public on-chain info); when set,
            // the app renders real buy/sell-on-Uniswap links for CARD.
            cardTokenAddress: process.env.CARD_TOKEN_ADDRESS ?? null,
          });
        }

        await scopedProxy(base, fetchImpl, upstream, req, res, url, user, audit);
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
 * Successful order placement/cancellation is written to the audit trail.
 */
async function scopedProxy(
  base: string,
  fetchImpl: typeof fetch,
  upstream: (method: string, path: string, body?: unknown) => Promise<any>,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  user: User,
  audit: (req: IncomingMessage, action: string, fields?: { userId?: string; email?: string; detail?: string }) => void,
): Promise<void> {
  const method = req.method ?? 'GET';
  const segments = url.pathname.slice('/api'.length).split('/').filter((s) => s.length > 0);
  const query = url.searchParams;
  let body: string | undefined;
  let auditAction: string | undefined;

  const accountId = user.accountId;
  const acct = encodeURIComponent(accountId);
  let upstreamPath: string | undefined;

  const [head, second, third] = segments.map((s) => decodeURIComponent(s));

  if (method === 'GET' && (head === 'instruments' || head === 'quotes' || head === 'meta')) {
    upstreamPath = '/' + segments.join('/');
  } else if (method === 'GET' && head === 'portfolio' && segments.length === 2) {
    upstreamPath = `/portfolio/${acct}`;
  } else if (method === 'GET' && head === 'portfolio' && segments.length === 3 && third === 'history') {
    upstreamPath = `/portfolio/${acct}/history`;
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
      auditAction = 'order_placed';
    }
  } else if (head === 'plans' && segments.length === 1) {
    if (method === 'GET') {
      query.set('accountId', accountId);
      upstreamPath = '/plans';
    } else if (method === 'POST') {
      const parsed = asObject(await readJson(req));
      parsed.accountId = accountId;
      body = JSON.stringify(parsed);
      upstreamPath = '/plans';
      auditAction = 'plan_created';
    }
  } else if (head === 'plans' && segments.length >= 2) {
    const planId = second;
    const isGet = method === 'GET' && segments.length === 2;
    const isDelete = method === 'DELETE' && segments.length === 2;
    const isToggle = method === 'POST' && segments.length === 3 && (third === 'pause' || third === 'resume');
    if (isGet || isDelete || isToggle) {
      let plan: any;
      try {
        plan = await upstream('GET', `/plans/${encodeURIComponent(planId)}`);
      } catch {
        plan = undefined;
      }
      if (!plan || plan.accountId !== accountId) {
        return sendError(res, 404, 'not_found', `Plan not found: ${planId}`);
      }
      upstreamPath = '/' + segments.join('/');
      if (isDelete) auditAction = 'plan_deleted';
      if (isToggle) auditAction = third === 'pause' ? 'plan_paused' : 'plan_resumed';
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
      if (isCancel) {
        body = await readRaw(req);
        auditAction = 'order_cancelled';
      }
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

  if (auditAction && upstreamRes.status < 300) {
    const detail = auditAction.startsWith('order') ? orderSummary(text) : planSummary(text);
    audit(req, auditAction, { userId: user.id, email: user.email, detail });
  }

  res.writeHead(upstreamRes.status, { 'content-type': 'application/json' });
  res.end(text);
}

/** Compact "id symbol side type xqty status" line for the audit trail. */
function orderSummary(responseText: string): string | undefined {
  try {
    const o = JSON.parse(responseText);
    return `${o.id} ${o.symbol} ${o.side} ${o.type} x${o.quantity} ${o.status}`;
  } catch {
    return undefined;
  }
}

/** Compact "id symbol amount¢ cadence" line for recurring-plan audit events. */
function planSummary(responseText: string): string | undefined {
  try {
    const p = JSON.parse(responseText);
    return p && p.id ? `${p.id} ${p.symbol} ${p.amountCents}¢ ${p.cadence}` : undefined;
  } catch {
    return undefined;
  }
}

/** Reject state-changing requests whose Origin is present and cross-site. */
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || origin.length === 0) return true; // non-browser clients
  if (origin === 'null') return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  return originHost === req.headers.host;
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

function boolFromEnv(v: string | undefined): boolean {
  return v === '1' || v === 'true' || v === 'yes';
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
