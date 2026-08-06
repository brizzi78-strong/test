/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * Routes:
 *   GET    /health
 *   GET    /                              -> web app (src/web/index.html)
 *   POST   /returns                       -> start a new return
 *   GET    /returns                       -> list this user's returns
 *   GET    /returns/:id                   -> return + live computation
 *   DELETE /returns/:id
 *   PUT    /returns/:id/personal
 *   PUT    /returns/:id/filing-status
 *   PUT    /returns/:id/dependents
 *   PUT    /returns/:id/income
 *   PUT    /returns/:id/deductions
 *   GET    /returns/:id/review            -> computation + file blockers
 *   POST   /returns/:id/file              -> mock e-file
 *
 * The requester is identified by the `x-user-id` header (default "demo") —
 * lightweight tenancy in the same spirit as the other apps in this repo.
 */

import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DomainError } from '../service/errors.ts';
import type { TaxReturnService } from '../service/taxReturnService.ts';

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
  service: TaxReturnService,
  webIndexPath: URL,
  opts: ListenerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const routes: Route[] = [];
  const route = (method: string, path: string, handler: Handler): void => {
    routes.push({ method, segments: path.split('/').filter(Boolean), handler });
  };

  route('GET', '/health', () => ok({ status: 'ok' }));
  route('POST', '/returns', (ctx) => created(service.createReturn(ctx.userId)));
  route('GET', '/returns', (ctx) => ok({ returns: service.listReturns(ctx.userId) }));
  route('GET', '/returns/:id', (ctx) => ok(service.getReturn(ctx.userId, ctx.params.id!)));
  route('DELETE', '/returns/:id', (ctx) => {
    service.deleteReturn(ctx.userId, ctx.params.id!);
    return ok({ deleted: true });
  });
  route('PUT', '/returns/:id/personal', (ctx) =>
    ok(service.updatePersonal(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/filing-status', (ctx) =>
    ok(service.updateFilingStatus(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/dependents', (ctx) =>
    ok(service.updateDependents(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/income', (ctx) =>
    ok(service.updateIncome(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/deductions', (ctx) =>
    ok(service.updateDeductions(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('GET', '/returns/:id/review', (ctx) => {
    const { taxReturn, computation } = service.getReturn(ctx.userId, ctx.params.id!);
    return ok({ taxReturn, computation, fileBlockers: service.fileBlockers(taxReturn) });
  });
  route('POST', '/returns/:id/file', (ctx) =>
    ok(service.fileReturn(ctx.userId, ctx.params.id!)),
  );

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
        'www-authenticate': `Basic realm="${opts.brandName ?? 'TaxFile'}"`,
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
            .replace('<title>TaxFile', `<title>${opts.brandName}`)
            .replace('<h1>TaxFile<', `<h1>${opts.brandName}<`);
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
