/**
 * Zero-dependency HTTP server: the single-page app at `/`, JSON API under
 * `/api/*`, and an optional Basic-auth gate (SCOUT_USER/SCOUT_PASSWORD) that
 * keeps `/health` open for platform probes.
 *
 * Routes:
 *   GET  /health
 *   GET  /                          -> web app
 *   GET  /api/app                   -> { brandName }
 *   GET  /api/catalog               -> hot list, most-wanted first
 *   POST /api/catalog               -> add or update a demand signal
 *   POST /api/scans                 -> appraise a copy (buy/pass verdict)
 *   GET  /api/scans                 -> recent scans
 *   POST /api/scans/:id/buy         -> convert a scan into inventory
 *   GET  /api/inventory
 *   POST /api/inventory/:id/list    -> { priceCents }
 *   POST /api/inventory/:id/sold    -> { soldCents? } defaults to list price
 *   GET  /api/stats
 */

import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { DomainError } from '../service/errors.ts';
import { ScoutService } from '../service/scoutService.ts';
import { PAGE } from '../ui/page.ts';

export interface AppServer {
  server: Server;
  service: ScoutService;
}

export interface AppOptions {
  /** Basic-auth gate; both must be set to enable it. */
  user?: string;
  password?: string;
  /** Display name substituted into the web app (BRAND_NAME). */
  brandName?: string;
  /** Start with an empty catalog (tests); defaults to the seeded hot list. */
  seed?: boolean;
}

interface RouteResult {
  status: number;
  body: unknown;
}

const ok = (body: unknown): RouteResult => ({ status: 200, body });
const created = (body: unknown): RouteResult => ({ status: 201, body });

function authorized(req: IncomingMessage, gate: { user: string; password: string }): boolean {
  const expected = Buffer.from(
    `Basic ${Buffer.from(`${gate.user}:${gate.password}`).toString('base64')}`,
  );
  const given = Buffer.from(req.headers.authorization ?? '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createApp(opts: AppOptions = {}): AppServer {
  const user = opts.user ?? process.env.SCOUT_USER;
  const password = opts.password ?? process.env.SCOUT_PASSWORD;
  const gate = user && password ? { user, password } : undefined;
  const brandName = opts.brandName ?? process.env.BRAND_NAME ?? 'Cardinal Scout';
  const service = new ScoutService({ seed: opts.seed });

  type Handler = (params: Record<string, string>, body: unknown) => RouteResult;
  const routes: { method: string; segments: string[]; handler: Handler }[] = [];
  const route = (method: string, path: string, handler: Handler): void => {
    routes.push({ method, segments: path.split('/').filter(Boolean), handler });
  };

  route('GET', '/health', () => ok({ status: 'ok' }));
  route('GET', '/api/app', () => ok({ brandName }));
  route('GET', '/api/catalog', () => ok(service.listCatalog()));
  route('POST', '/api/catalog', (_p, body) => created(service.upsertSignal(body)));
  route('POST', '/api/scans', (_p, body) => created(service.scan(body)));
  route('GET', '/api/scans', () => ok(service.listScans()));
  route('POST', '/api/scans/:id/buy', (p) => created(service.buy(p.id!)));
  route('GET', '/api/inventory', () => ok(service.listInventory()));
  route('POST', '/api/inventory/:id/list', (p, body) => ok(service.listItem(p.id!, body)));
  route('POST', '/api/inventory/:id/sold', (p, body) => ok(service.markSold(p.id!, body)));
  route('GET', '/api/stats', () => ok(service.stats()));

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const send = (status: number, body: unknown, contentType = 'application/json'): void => {
      const payload = contentType === 'application/json' ? JSON.stringify(body) : String(body);
      res.writeHead(status, { 'content-type': `${contentType}; charset=utf-8` });
      res.end(payload);
    };

    if (gate && url.pathname !== '/health' && !authorized(req, gate)) {
      res.writeHead(401, {
        'www-authenticate': `Basic realm="${brandName}"`,
        'content-type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify({ error: 'authentication required' }));
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      send(200, PAGE.replaceAll('Cardinal Scout', brandName), 'text/html');
      return;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    let found: { handler: Handler; params: Record<string, string> } | undefined;
    for (const r of routes) {
      if (r.method !== req.method || r.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < r.segments.length; i++) {
        const pattern = r.segments[i]!;
        if (pattern.startsWith(':')) params[pattern.slice(1)] = decodeURIComponent(segments[i]!);
        else if (pattern !== segments[i]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        found = { handler: r.handler, params };
        break;
      }
    }
    if (!found) {
      send(404, { error: `no route for ${req.method} ${url.pathname}` });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      let body: unknown = undefined;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.length > 0) {
        try {
          body = JSON.parse(raw);
        } catch {
          send(400, { error: 'request body must be valid JSON' });
          return;
        }
      }
      try {
        const result = found.handler(found.params, body);
        send(result.status, result.body);
      } catch (err) {
        if (err instanceof DomainError) send(err.status, { error: err.message });
        else {
          send(500, { error: 'internal error' });
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    });
  });

  return { server, service };
}
