/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * A small route table maps `METHOD /path/:param` patterns to handlers; framing
 * (status codes, JSON encoding, DomainError translation) is handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BenefitType } from '../domain/types.ts';
import { BENEFIT_TYPES, COVERAGE_TIERS } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { BenefitsService } from '../service/benefitsService.ts';

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

export function buildRoutes(service: BenefitsService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    [
      'GET',
      '/meta',
      () => ok({ service: 'benefits', benefitTypes: BENEFIT_TYPES, coverageTiers: COVERAGE_TIERS }),
    ],

    ['POST', '/companies', ({ body }) => created(service.createCompany(asObject(body) as never))],
    ['POST', '/employees', ({ body }) => created(service.createEmployee(asObject(body) as never))],

    ['POST', '/plans', ({ body }) => created(service.createPlan(asObject(body) as never))],
    [
      'GET',
      '/plans',
      ({ query }) =>
        ok(
          service.listPlans({
            companyId: query.get('companyId') ?? undefined,
            type: (query.get('type') as BenefitType | null) ?? undefined,
          }),
        ),
    ],
    ['GET', '/plans/:id', ({ params }) => ok(service.getPlan(params.id))],

    ['POST', '/enrollments', ({ body }) => created(service.startEnrollment(asObject(body) as never))],
    [
      'GET',
      '/enrollments',
      ({ query }) =>
        ok(
          service.listEnrollments({
            companyId: query.get('companyId') ?? undefined,
            employeeId: query.get('employeeId') ?? undefined,
          }),
        ),
    ],
    ['GET', '/enrollments/:id', ({ params }) => ok(service.getEnrollment(params.id))],
    ['GET', '/enrollments/:id/summary', ({ params }) => ok(service.getSummary(params.id))],
    [
      'POST',
      '/enrollments/:id/dependents',
      ({ params, body }) => ok(service.addDependent(params.id, asObject(body) as never)),
    ],
    [
      'POST',
      '/enrollments/:id/elect',
      ({ params, body }) => ok(service.elect(params.id, asObject(body) as never)),
    ],
    [
      'POST',
      '/enrollments/:id/waive',
      ({ params, body }) => {
        const type = asObject(body).type;
        if (typeof type !== 'string') throw new ValidationError('type is required');
        return ok(service.waive(params.id, type as BenefitType));
      },
    ],
    ['POST', '/enrollments/:id/submit', ({ params }) => ok(service.submit(params.id))],
    [
      'POST',
      '/enrollments/:id/confirm',
      ({ params, body }) => ok(service.confirm(params.id, asObject(body) as never)),
    ],
    ['POST', '/enrollments/:id/reopen', ({ params }) => ok(service.reopen(params.id))],
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
export function createRequestListener(service: BenefitsService) {
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
      const result = await match.route.handler({
        params: match.params,
        query: url.searchParams,
        body,
      });
      sendJson(res, result.status, result.body);
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
