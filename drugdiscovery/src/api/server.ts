/**
 * Drug Discovery HTTP server — one self-contained app.
 *
 *   GET /            → the discovery workbench (programs, targets, compounds, screens, ranking)
 *   /api/*           → JSON API
 *
 * The console can be password-gated (DRUGDISCOVERY_USER / DRUGDISCOVERY_PASSWORD)
 * since a program's target list and candidate structures are proprietary IP.
 * A durable SQLite store is selected with DRUGDISCOVERY_DB; unset uses the
 * in-memory store.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { DrugDiscoveryService } from '../service/drugDiscoveryService.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { APP_PAGE } from '../ui/pages.ts';

export interface AppServer {
  server: Server;
  service: DrugDiscoveryService;
}

export interface AppOptions {
  store?: Store;
  user?: string;
  password?: string;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.DRUGDISCOVERY_DB ? createSqliteStore(env.DRUGDISCOVERY_DB) : createInMemoryStore();
}

export function createApp(opts: AppOptions = {}): AppServer {
  const service = new DrugDiscoveryService({ store: opts.store ?? storeFromEnv() });
  const user = opts.user ?? process.env.DRUGDISCOVERY_USER;
  const password = opts.password ?? process.env.DRUGDISCOVERY_PASSWORD;
  const gate = user && password ? { user, password } : undefined;
  const server = createServer(makeListener(service, gate));
  return { server, service };
}

function isPublicPath(path: string): boolean {
  return path === '/health';
}

function makeListener(service: DrugDiscoveryService, gate: { user: string; password: string } | undefined) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';

      if (gate && !isPublicPath(path) && !authorized(req, gate)) {
        res.writeHead(401, {
          'www-authenticate': 'Basic realm="Drug Discovery", charset="UTF-8"',
          'content-type': 'application/json',
        });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'authentication required' } }));
        return;
      }

      if (method === 'GET' && (path === '/' || path === '/index.html')) return html(res, APP_PAGE);
      if (method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });
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
  service: DrugDiscoveryService,
  method: string,
  path: string,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const q = url.searchParams;
  const seg = path.split('/').filter(Boolean); // ["api", ...]
  const body = method === 'GET' ? {} : ((await readJson(req)) as Record<string, unknown>);

  if (method === 'GET' && path === '/api/meta') return json(res, 200, { service: 'drugdiscovery' });

  // programs
  if (method === 'POST' && path === '/api/programs') return json(res, 201, service.createProgram(body as never));
  if (method === 'GET' && path === '/api/programs') return json(res, 200, service.listPrograms());
  if (method === 'GET' && seg[1] === 'programs' && seg[2] && seg.length === 3) return json(res, 200, service.getProgram(seg[2]));

  // targets
  if (method === 'POST' && path === '/api/targets') return json(res, 201, service.createTarget(body as never));
  if (method === 'GET' && path === '/api/targets')
    return json(res, 200, service.listTargets({ programId: q.get('programId') ?? undefined }));
  if (method === 'GET' && seg[1] === 'targets' && seg[2] && seg.length === 3) return json(res, 200, service.getTarget(seg[2]));
  if (method === 'GET' && seg[1] === 'targets' && seg[3] === 'ranking')
    return json(res, 200, service.rankCandidates(seg[2], numOrUndefined(q.get('limit'))));

  // compounds ("discover and create" a candidate, then evaluate/advance it)
  if (method === 'POST' && path === '/api/compounds') return json(res, 201, service.createCompound(body as never));
  if (method === 'GET' && path === '/api/compounds')
    return json(res, 200, service.listCompounds({
      programId: q.get('programId') ?? undefined,
      targetId: q.get('targetId') ?? undefined,
      stage: (q.get('stage') as never) ?? undefined,
    }));
  if (method === 'GET' && seg[1] === 'compounds' && seg[2] && seg.length === 3) return json(res, 200, service.getCompound(seg[2]));
  if (method === 'POST' && seg[1] === 'compounds' && seg[3] === 'advance')
    return json(res, 200, service.advanceCompound(seg[2], String(body.stage ?? '') as never));

  // evaluate a descriptor profile without persisting (the "what if" tool)
  if (method === 'POST' && path === '/api/evaluate')
    return json(res, 200, service.evaluateDescriptors((body.descriptors ?? body) as never));

  // screens
  if (method === 'POST' && path === '/api/screens') return json(res, 201, service.recordScreen(body as never));
  if (method === 'GET' && path === '/api/screens')
    return json(res, 200, service.listScreens({
      compoundId: q.get('compoundId') ?? undefined,
      targetId: q.get('targetId') ?? undefined,
    }));

  json(res, 404, { error: { code: 'not_found', message: 'route not found' } });
}

function numOrUndefined(v: string | null): number | undefined {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new ValidationError('limit must be a number');
  return n;
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
