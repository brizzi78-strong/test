/**
 * Zero-dependency HTTP router over Node's built-in http module. A small route
 * table maps `METHOD /path/:param` patterns to handlers; framing (status codes,
 * JSON, DomainError translation) and per-tenant scoping live here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { readTenant, scopeRequestToTenant, scopeResultToTenant } from './tenancy.ts';
import { APPOINTMENT_STATUSES, REFERENCE_STATUSES, type AppointmentStatus } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { BookingService } from '../service/bookingService.ts';

interface Ctx {
  params: Record<string, string>;
  query: URLSearchParams;
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

function asObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

export function buildRoutes(service: BookingService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    [
      'GET',
      '/meta',
      () => ok({ service: 'booking', appointmentStatuses: APPOINTMENT_STATUSES, referenceStatuses: REFERENCE_STATUSES }),
    ],

    ['POST', '/companies', ({ body }) => created(service.createCompany(asObject(body) as never))],

    ['POST', '/services', ({ body }) => created(service.createService(asObject(body) as never))],
    ['GET', '/services', ({ query }) => ok(service.listServices({ companyId: query.get('companyId') ?? undefined }))],

    ['POST', '/workers', ({ body }) => created(service.createWorker(asObject(body) as never))],
    ['GET', '/workers', ({ query }) => ok(service.listWorkers({ companyId: query.get('companyId') ?? undefined }))],
    ['GET', '/workers/:id', ({ params }) => ok(service.getWorker(params.id))],
    ['POST', '/workers/:id/references', ({ params, body }) => created(service.addReference({ ...asObject(body), workerId: params.id } as never))],
    ['GET', '/workers/:id/references', ({ params }) => ok(service.listReferences({ workerId: params.id }))],

    ['POST', '/appointments', ({ body }) => created(service.requestAppointment(asObject(body) as never))],
    [
      'GET',
      '/appointments',
      ({ query }) =>
        ok(
          service.listAppointments({
            companyId: query.get('companyId') ?? undefined,
            workerId: query.get('workerId') ?? undefined,
            status: (query.get('status') as AppointmentStatus | null) ?? undefined,
            from: query.get('from') ?? undefined,
            to: query.get('to') ?? undefined,
          }),
        ),
    ],
    ['GET', '/appointments/:id', ({ params }) => ok(service.getAppointment(params.id))],
    ['POST', '/appointments/:id/confirm', ({ params, body }) => ok(service.confirmAppointment(params.id, asObject(body ?? {}) as never))],
    ['POST', '/appointments/:id/complete', ({ params, body }) => ok(service.completeAppointment(params.id, asObject(body ?? {}) as never))],
    ['POST', '/appointments/:id/cancel', ({ params, body }) => ok(service.cancelAppointment(params.id, asObject(body ?? {}) as never))],
    ['POST', '/appointments/:id/no-show', ({ params, body }) => ok(service.markNoShow(params.id, asObject(body ?? {}) as never))],
    ['POST', '/appointments/:id/reschedule', ({ params, body }) => ok(service.rescheduleAppointment(params.id, asObject(body) as never))],

    ['GET', '/references/:id', ({ params }) => ok(service.getReference(params.id))],
    ['POST', '/references/:id/record', ({ params, body }) => ok(service.recordReference(params.id, asObject(body) as never))],
  ];
  return routes.map(([method, path, handler]) => ({ method, segments: splitPath(path), handler }));
}

function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

function matchRoute(routes: Route[], method: string, segs: string[]): { route: Route; params: Record<string, string> } | undefined {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== segs.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < route.segments.length; i++) {
      const seg = route.segments[i];
      if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(segs[i]);
      else if (seg !== segs[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return undefined;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError('request body is not valid JSON');
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}

export function createRequestListener(service: BookingService) {
  const routes = buildRoutes(service);
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const segs = splitPath(url.pathname);
      const match = matchRoute(routes, req.method ?? 'GET', segs);
      if (!match) {
        sendJson(res, 404, { error: { code: 'not_found', message: 'route not found' } });
        return;
      }
      const body = req.method === 'GET' ? undefined : await readJsonBody(req);
      const tenant = readTenant(req.headers);
      if (tenant) scopeRequestToTenant(tenant, url.searchParams, body);
      const result = match.route.handler({ params: match.params, query: url.searchParams, body });
      const scoped = tenant
        ? scopeResultToTenant(tenant, result.status, result.body)
        : { status: result.status, body: result.body };
      sendJson(res, scoped.status, scoped.body);
    } catch (err) {
      if (err instanceof DomainError) {
        sendJson(res, err.status, { error: { code: err.code, message: err.message } });
        return;
      }
      const message = err instanceof Error ? err.message : 'internal error';
      sendJson(res, 500, { error: { code: 'internal', message } });
    }
  };
}
