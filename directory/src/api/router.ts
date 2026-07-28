/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * A small route table maps `METHOD /path/:param` patterns to handlers; framing
 * (status codes, JSON encoding, DomainError translation) is handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { readTenant, scopeRequestToTenant, scopeResultToTenant } from './tenancy.ts';
import type { EmploymentStatus } from '../domain/types.ts';
import { EMPLOYMENT_TYPES } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { DirectoryService } from '../service/directoryService.ts';

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

/** Read an optional string field that may also be explicit null (to clear). */
function optionalNullableString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (v === null) return null;
  if (typeof v === 'string') return v;
  throw new ValidationError(`${key} must be a string or null`);
}

export function buildRoutes(service: DirectoryService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    ['GET', '/meta', () => ok({ service: 'directory', employmentTypes: EMPLOYMENT_TYPES })],

    ['POST', '/companies', ({ body }) => created(service.createCompany(asObject(body) as never))],

    ['POST', '/departments', ({ body }) => created(service.createDepartment(asObject(body) as never))],
    [
      'GET',
      '/departments',
      ({ query }) => {
        const companyId = query.get('companyId');
        if (!companyId) throw new ValidationError('companyId query param is required');
        return ok(service.listDepartments(companyId));
      },
    ],

    ['POST', '/employees', ({ body }) => created(service.createEmployee(asObject(body) as never))],
    [
      'GET',
      '/employees',
      ({ query }) =>
        ok(
          service.listEmployees({
            companyId: query.get('companyId') ?? undefined,
            departmentId: query.get('departmentId') ?? undefined,
            managerId: query.get('managerId') ?? undefined,
            status: (query.get('status') as EmploymentStatus | null) ?? undefined,
            search: query.get('search') ?? undefined,
          }),
        ),
    ],
    ['GET', '/employees/:id', ({ params }) => ok(service.getEmployee(params.id))],
    ['PATCH', '/employees/:id', ({ params, body }) => ok(service.updateEmployee(params.id, asObject(body) as never))],
    [
      'POST',
      '/employees/:id/department',
      ({ params, body }) => ok(service.assignDepartment(params.id, optionalNullableString(asObject(body), 'departmentId'))),
    ],
    [
      'POST',
      '/employees/:id/manager',
      ({ params, body }) => ok(service.setManager(params.id, optionalNullableString(asObject(body), 'managerId'))),
    ],
    [
      'POST',
      '/employees/:id/status',
      ({ params, body }) => ok(service.changeStatus(params.id, asObject(body) as never)),
    ],
    ['GET', '/employees/:id/reports', ({ params }) => ok(service.directReports(params.id))],
    ['GET', '/employees/:id/reporting-chain', ({ params }) => ok(service.reportingChain(params.id))],
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
export function createRequestListener(service: DirectoryService) {
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
