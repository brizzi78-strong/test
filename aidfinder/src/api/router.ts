/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * Routes:
 *   GET    /health
 *   GET    /                       -> web app (src/web/index.html)
 *   GET    /profile                -> the student profile (null until set)
 *   PUT    /profile                -> create/replace the profile
 *   GET    /opportunities          -> the full curated catalog
 *   GET    /matches                -> opportunities this student qualifies for
 *   GET    /plan                   -> deadline-ordered action plan
 *   POST   /applications           -> start tracking an opportunity
 *   GET    /applications           -> tracked applications + money dashboard
 *   PUT    /applications/:id       -> update status / amount won / note
 *   DELETE /applications/:id
 *
 * The requester is identified by the `x-user-id` header (default "demo") —
 * lightweight tenancy in the same spirit as the other apps in this repo.
 */

import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DomainError } from '../service/errors.ts';
import type { AidService } from '../service/aidService.ts';

export interface ListenerOptions {
  /** Optional HTTP Basic auth gate (recommended when public); both required. */
  gate?: { user: string; password: string };
  /** Display name substituted into the web app's title and header. */
  brandName?: string;
}

interface Ctx {
  userId: string;
  params: Record<string, string>;
  body: unknown;
}

interface RouteResult {
  status: number;
  body: unknown;
}

type Handler = (ctx: Ctx) => RouteResult;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
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

export function createRequestListener(
  service: AidService,
  webIndexPath: URL,
  opts: ListenerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const routes: Route[] = [];
  const route = (method: string, path: string, handler: Handler): void => {
    routes.push({ method, segments: path.split('/').filter(Boolean), handler });
  };

  route('GET', '/health', () => ok({ status: 'ok' }));
  route('GET', '/profile', (ctx) => ok({ profile: service.getProfile(ctx.userId) }));
  route('PUT', '/profile', (ctx) => ok({ profile: service.updateProfile(ctx.userId, ctx.body) }));
  route('GET', '/opportunities', () => ok({ opportunities: service.listOpportunities() }));
  route('GET', '/matches', (ctx) => ok(service.getMatches(ctx.userId)));
  route('GET', '/plan', (ctx) => ok({ plan: service.getPlan(ctx.userId) }));
  route('POST', '/applications', (ctx) => created(service.trackApplication(ctx.userId, ctx.body)));
  route('GET', '/applications', (ctx) => ok(service.listApplications(ctx.userId)));
  route('PUT', '/applications/:id', (ctx) =>
    ok(service.updateApplication(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('DELETE', '/applications/:id', (ctx) => {
    service.deleteApplication(ctx.userId, ctx.params.id!);
    return ok({ deleted: true });
  });

  const match = (
    method: string,
    pathSegments: string[],
  ): { handler: Handler; params: Record<string, string> } | undefined => {
    for (const r of routes) {
      if (r.method !== method || r.segments.length !== pathSegments.length) continue;
      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < r.segments.length; i++) {
        const pattern = r.segments[i]!;
        if (pattern.startsWith(':')) params[pattern.slice(1)] = decodeURIComponent(pathSegments[i]!);
        else if (pattern !== pathSegments[i]) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler: r.handler, params };
    }
    return undefined;
  };

  return (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const send = (status: number, body: unknown, contentType = 'application/json'): void => {
      const payload = contentType === 'application/json' ? JSON.stringify(body) : String(body);
      res.writeHead(status, { 'content-type': `${contentType}; charset=utf-8` });
      res.end(payload);
    };

    // The health check stays open so the hosting platform can probe it.
    if (opts.gate && url.pathname !== '/health' && !authorized(req, opts.gate)) {
      res.writeHead(401, {
        'www-authenticate': `Basic realm="${opts.brandName ?? 'AidFinder'}"`,
        'content-type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify({ error: 'authentication required' }));
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      try {
        let html = readFileSync(webIndexPath, 'utf8');
        if (opts.brandName) {
          html = html
            .replace('<title>AidFinder', `<title>${opts.brandName}`)
            .replace('<h1>AidFinder<', `<h1>${opts.brandName}<`);
        }
        send(200, html, 'text/html');
      } catch {
        send(404, { error: 'web UI not found' });
      }
      return;
    }

    const found = match(req.method ?? 'GET', url.pathname.split('/').filter(Boolean));
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
      const userId = String(req.headers['x-user-id'] ?? 'demo');
      try {
        const result = found.handler({ userId, params: found.params, body });
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
  };
}
