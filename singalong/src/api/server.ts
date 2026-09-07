/**
 * Sing Along HTTP server — one self-contained app.
 *
 *   GET /            → the activity-staff console (library, residents, playlists, the player)
 *   /api/*           → JSON API
 *
 * The console can be password-gated (SINGALONG_USER / SINGALONG_PASSWORD) since
 * resident names and musical-preference notes are on it. A durable SQLite store
 * is selected with SINGALONG_DB; unset uses the in-memory store.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { SingAlongService } from '../service/singalongService.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { APP_PAGE } from '../ui/pages.ts';

export interface AppServer {
  server: Server;
  service: SingAlongService;
}

export interface AppOptions {
  store?: Store;
  user?: string;
  password?: string;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.SINGALONG_DB ? createSqliteStore(env.SINGALONG_DB) : createInMemoryStore();
}

export function createApp(opts: AppOptions = {}): AppServer {
  const service = new SingAlongService({ store: opts.store ?? storeFromEnv() });
  const user = opts.user ?? process.env.SINGALONG_USER;
  const password = opts.password ?? process.env.SINGALONG_PASSWORD;
  const gate = user && password ? { user, password } : undefined;
  const server = createServer(makeListener(service, gate));
  return { server, service };
}

function isPublicPath(path: string): boolean {
  return path === '/health';
}

function makeListener(service: SingAlongService, gate: { user: string; password: string } | undefined) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';

      if (gate && !isPublicPath(path) && !authorized(req, gate)) {
        res.writeHead(401, {
          'www-authenticate': 'Basic realm="Sing Along", charset="UTF-8"',
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
  service: SingAlongService,
  method: string,
  path: string,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const q = url.searchParams;
  const seg = path.split('/').filter(Boolean); // ["api", ...]
  const body = method === 'GET' ? {} : ((await readJson(req)) as Record<string, unknown>);

  if (method === 'GET' && path === '/api/meta') return json(res, 200, { service: 'singalong' });

  if (method === 'POST' && path === '/api/facilities') return json(res, 201, service.createFacility(body as never));

  if (method === 'POST' && path === '/api/residents') return json(res, 201, service.createResident(body as never));
  if (method === 'GET' && path === '/api/residents') return json(res, 200, service.listResidents({ facilityId: q.get('facilityId') ?? undefined }));
  if (method === 'GET' && seg[1] === 'residents' && seg[2] && seg.length === 3) return json(res, 200, service.getResident(seg[2]));
  if (method === 'GET' && seg[1] === 'residents' && seg[3] === 'suggestions')
    return json(res, 200, service.suggestSongsForResident(seg[2], numOrUndefined(q.get('limit'))));
  if (method === 'GET' && seg[1] === 'residents' && seg[3] === 'insights')
    return json(res, 200, service.insightsForResident(seg[2], numOrUndefined(q.get('limit'))));

  if (method === 'POST' && path === '/api/songs') return json(res, 201, service.addSong(body as never));
  if (method === 'GET' && path === '/api/songs') return json(res, 200, service.listSongs({ facilityId: q.get('facilityId') ?? undefined }));
  if (method === 'GET' && seg[1] === 'songs' && seg[2]) return json(res, 200, service.getSong(seg[2]));

  if (method === 'POST' && path === '/api/playlists') return json(res, 201, service.createPlaylist(body as never));
  if (method === 'GET' && path === '/api/playlists')
    return json(res, 200, service.listPlaylists({ facilityId: q.get('facilityId') ?? undefined, residentId: q.get('residentId') ?? undefined }));
  if (method === 'GET' && seg[1] === 'playlists' && seg[2] && seg.length === 3) return json(res, 200, service.getPlaylist(seg[2]));
  if (method === 'POST' && seg[1] === 'playlists' && seg[3] === 'songs')
    return json(res, 200, service.addSongToPlaylist(seg[2], String(body.songId ?? '')));

  if (method === 'POST' && path === '/api/sessions') return json(res, 201, service.startSession(body as never));
  if (method === 'GET' && path === '/api/sessions')
    return json(res, 200, service.listSessions({ facilityId: q.get('facilityId') ?? undefined, residentId: q.get('residentId') ?? undefined }));
  if (method === 'GET' && seg[1] === 'sessions' && seg[2] && seg.length === 3) return json(res, 200, service.getSession(seg[2]));
  if (method === 'POST' && seg[1] === 'sessions' && seg[3] === 'log') return json(res, 200, service.logEntry(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'sessions' && seg[3] === 'complete') return json(res, 200, service.completeSession(seg[2], body as never));
  if (method === 'POST' && seg[1] === 'sessions' && seg[3] === 'cancel') return json(res, 200, service.cancelSession(seg[2]));

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
