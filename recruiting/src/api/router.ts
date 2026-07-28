/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * A small route table maps `METHOD /path/:param` patterns to handlers; framing
 * (status codes, JSON encoding, DomainError translation) is handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { readTenant, scopeRequestToTenant, scopeResultToTenant } from './tenancy.ts';
import type { ApplicationStage, RequisitionStatus } from '../domain/types.ts';
import { EMPLOYMENT_TYPES } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { RecruitingService } from '../service/recruitingService.ts';

interface HandlerContext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

interface RouteResult {
  status: number;
  body: unknown;
}

type Handler = (ctx: HandlerContext) => RouteResult | Promise<RouteResult>;

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

export function buildRoutes(service: RecruitingService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    ['GET', '/meta', () => ok({ service: 'recruiting', employmentTypes: EMPLOYMENT_TYPES })],

    ['POST', '/companies', ({ body }) => created(service.createCompany(asObject(body) as never))],

    ['POST', '/requisitions', ({ body }) => created(service.createRequisition(asObject(body) as never))],
    [
      'GET',
      '/requisitions',
      ({ query }) =>
        ok(
          service.listRequisitions({
            companyId: query.get('companyId') ?? undefined,
            status: (query.get('status') as RequisitionStatus | null) ?? undefined,
          }),
        ),
    ],
    ['GET', '/requisitions/:id', ({ params }) => ok(service.getRequisition(params.id))],
    [
      'POST',
      '/requisitions/:id/status',
      ({ params, body }) => {
        const status = asObject(body).status;
        if (typeof status !== 'string') throw new ValidationError('status is required');
        return ok(service.setRequisitionStatus(params.id, status as RequisitionStatus));
      },
    ],

    ['POST', '/applications', ({ body }) => created(service.createApplication(asObject(body) as never))],
    [
      'GET',
      '/applications',
      ({ query }) =>
        ok(
          service.listApplications({
            companyId: query.get('companyId') ?? undefined,
            requisitionId: query.get('requisitionId') ?? undefined,
            stage: (query.get('stage') as ApplicationStage | null) ?? undefined,
          }),
        ),
    ],
    ['GET', '/applications/:id', ({ params }) => ok(service.getApplication(params.id))],
    [
      'POST',
      '/applications/:id/advance',
      ({ params, body }) => {
        const b = asObject(body);
        if (typeof b.toStage !== 'string') throw new ValidationError('toStage is required');
        return ok(
          service.advanceApplication(params.id, {
            toStage: b.toStage as ApplicationStage,
            by: typeof b.by === 'string' ? b.by : undefined,
            note: typeof b.note === 'string' ? b.note : undefined,
          }),
        );
      },
    ],
    [
      'POST',
      '/applications/:id/hire',
      ({ params, body }) => {
        const b = asObject(body ?? {});
        return ok(
          service.hireApplication(params.id, {
            by: typeof b.by === 'string' ? b.by : undefined,
            fillRequisition: b.fillRequisition === true,
          }),
        );
      },
    ],
    [
      'POST',
      '/applications/:id/reject',
      ({ params, body }) => {
        const b = asObject(body ?? {});
        return ok(
          service.rejectApplication(params.id, {
            by: typeof b.by === 'string' ? b.by : undefined,
            reason: typeof b.reason === 'string' ? b.reason : undefined,
          }),
        );
      },
    ],
    [
      'POST',
      '/applications/:id/withdraw',
      ({ params, body }) => {
        const b = asObject(body ?? {});
        return ok(
          service.withdrawApplication(params.id, {
            reason: typeof b.reason === 'string' ? b.reason : undefined,
          }),
        );
      },
    ],
  ];

  return routes.map(([method, path, handler]) => ({
    method,
    segments: splitPath(path),
    handler,
  }));
}

function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

function matchRoute(
  routes: Route[],
  method: string,
  pathSegments: string[],
): { route: Route; params: Record<string, string> } | undefined {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== pathSegments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < route.segments.length; i++) {
      const seg = route.segments[i];
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(pathSegments[i]);
      } else if (seg !== pathSegments[i]) {
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

/** Build a Node http request listener bound to the given service. */
export function createRequestListener(service: RecruitingService) {
  const routes = buildRoutes(service);

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathSegments = splitPath(url.pathname);
      const match = matchRoute(routes, req.method ?? 'GET', pathSegments);

      if (!match) {
        sendJson(res, 404, { error: { code: 'not_found', message: 'route not found' } });
        return;
      }

      const body = req.method === 'GET' ? undefined : await readJsonBody(req);
      const tenant = readTenant(req.headers);
      if (tenant) scopeRequestToTenant(tenant, url.searchParams, body);
      const result = await match.route.handler({
        params: match.params,
        query: url.searchParams,
        body,
      });
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
