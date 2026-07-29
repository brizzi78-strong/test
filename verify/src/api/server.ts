/**
 * Cardinal Verify HTTP server — one self-contained app.
 *
 * Pages (HTML):
 *   GET /            → the business console (create requests, watch results)
 *   GET /c/:token    → the candidate's consent page (public link)
 *   GET /v/:token    → a verifier's attestation form (public link)
 *
 * JSON API (/api/*): companies, candidates, requests (admin) and the public,
 * token-based consent + verify endpoints.
 *
 * The admin surface can be password-gated (VERIFY_USER / VERIFY_PASSWORD); the
 * public consent and verify links are always open, since candidates and their
 * references have no login. A durable SQLite store is selected with VERIFY_DB.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { VerifyService, DISCLOSURE_VERSION } from '../service/verifyService.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { APP_PAGE, CONSENT_PAGE, VERIFIER_PAGE } from '../ui/pages.ts';
import { notifierFromEnv, type Notifier } from '../notify/notifier.ts';

export interface AppServer {
  server: Server;
  service: VerifyService;
}

export interface AppOptions {
  store?: Store;
  user?: string;
  password?: string;
  notifier?: Notifier;
  baseUrl?: string;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.VERIFY_DB ? createSqliteStore(env.VERIFY_DB) : createInMemoryStore();
}

/** Absolute base for links in emails: VERIFY_BASE_URL, else localhost:PORT. */
export function baseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return env.VERIFY_BASE_URL ?? `http://localhost:${env.PORT ?? 4600}`;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const service = new VerifyService({
    store: opts.store ?? storeFromEnv(),
    notifier: opts.notifier ?? notifierFromEnv(),
    baseUrl: opts.baseUrl ?? baseUrlFromEnv(),
  });
  const user = opts.user ?? process.env.VERIFY_USER;
  const password = opts.password ?? process.env.VERIFY_PASSWORD;
  const gate = user && password ? { user, password } : undefined;
  const server = createServer(makeListener(service, gate));
  return { server, service };
}

/** Public paths that must never require the admin login. */
function isPublicPath(path: string): boolean {
  return (
    path === '/health' ||
    path.startsWith('/c/') ||
    path.startsWith('/v/') ||
    path.startsWith('/api/consent/') ||
    path.startsWith('/api/verify/')
  );
}

function makeListener(service: VerifyService, gate: { user: string; password: string } | undefined) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';

      if (gate && !isPublicPath(path) && !authorized(req, gate)) {
        res.writeHead(401, {
          'www-authenticate': 'Basic realm="Cardinal Verify", charset="UTF-8"',
          'content-type': 'application/json',
        });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'authentication required' } }));
        return;
      }

      // --- HTML pages ---
      if (method === 'GET' && (path === '/' || path === '/index.html')) return html(res, APP_PAGE);
      if (method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });
      if (method === 'GET' && path.startsWith('/c/')) return html(res, CONSENT_PAGE);
      if (method === 'GET' && path.startsWith('/v/')) return html(res, VERIFIER_PAGE);

      // --- JSON API ---
      if (path.startsWith('/api/')) return await api(service, method, path, url, req, res);

      json(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      if (err instanceof DomainError) return json(res, err.status, { error: { code: err.code, message: err.message } });
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) json(res, 500, { error: { code: 'internal', message } });
      else res.end();
    }
  };
}

async function api(
  service: VerifyService,
  method: string,
  path: string,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const q = url.searchParams;
  const seg = path.split('/').filter(Boolean); // ["api", ...]
  const body = method === 'GET' ? {} : ((await readJson(req)) as Record<string, unknown>);

  // /api/meta
  if (method === 'GET' && path === '/api/meta') {
    return json(res, 200, { service: 'verify', disclosureVersion: DISCLOSURE_VERSION });
  }

  // Admin: companies / candidates / requests
  if (method === 'POST' && path === '/api/companies') return json(res, 201, service.createCompany(body as never));
  if (method === 'POST' && path === '/api/candidates') return json(res, 201, service.createCandidate(body as never));
  if (method === 'GET' && path === '/api/candidates')
    return json(res, 200, service.listCandidates({ companyId: q.get('companyId') ?? undefined }));

  if (method === 'POST' && path === '/api/requests') return json(res, 201, await service.createRequest(body as never));
  if (method === 'GET' && path === '/api/requests')
    return json(res, 200, service.listRequests({
      companyId: q.get('companyId') ?? undefined,
      candidateId: q.get('candidateId') ?? undefined,
    }));
  if (method === 'GET' && seg[1] === 'requests' && seg[2] && seg.length === 3)
    return json(res, 200, service.view(seg[2]));
  if (method === 'POST' && seg[1] === 'requests' && seg[3] === 'cancel')
    return json(res, 200, service.cancelRequest(seg[2]));

  // Public: consent by token
  if (seg[1] === 'consent' && seg[2]) {
    if (method === 'GET') {
      const { request, candidate, company } = service.getByConsentToken(seg[2]);
      return json(res, 200, {
        companyName: company.name,
        candidateFirstName: candidate.firstName,
        status: request.status,
        alreadyConsented: !!request.consent,
        disclosureVersion: DISCLOSURE_VERSION,
        items: request.items.map((it) => ({ type: it.type, subject: it.subject, detail: it.detail })),
      });
    }
    if (method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? undefined;
      await service.recordConsent(seg[2], { signedName: String(body.signedName ?? ''), ip });
      return json(res, 200, { ok: true });
    }
  }

  // Public: verify by token
  if (seg[1] === 'verify' && seg[2]) {
    if (method === 'GET') return json(res, 200, service.getItemByToken(seg[2]));
    if (method === 'POST')
      return json(res, 200, service.submitVerification(seg[2], body as never));
  }

  json(res, 404, { error: { code: 'not_found', message: 'route not found' } });
}

function authorized(req: IncomingMessage, gate: { user: string; password: string }): boolean {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  return safeEqual(decoded.slice(0, i), gate.user) && safeEqual(decoded.slice(i + 1), gate.password);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError('request body is not valid JSON');
  }
}

function html(res: ServerResponse, page: string): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}
