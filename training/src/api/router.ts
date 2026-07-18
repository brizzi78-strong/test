/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * A small route table maps `METHOD /path/:param` patterns to handlers; framing
 * (status codes, JSON encoding, DomainError translation) is handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { EnrollmentStatus } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { TrainingService } from '../service/trainingService.ts';

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

export function buildRoutes(service: TrainingService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    ['GET', '/meta', () => ok({ service: 'training' })],

    ['POST', '/companies', ({ body }) => created(service.createCompany(asObject(body) as never))],
    ['POST', '/learners', ({ body }) => created(service.createLearner(asObject(body) as never))],

    ['POST', '/courses', ({ body }) => created(service.createCourse(asObject(body) as never))],
    [
      'GET',
      '/courses',
      ({ query }) => ok(service.listCourses({ companyId: query.get('companyId') ?? undefined })),
    ],
    ['GET', '/courses/:id', ({ params }) => ok(service.getCourse(params.id))],

    ['POST', '/enrollments', ({ body }) => created(service.enroll(asObject(body) as never))],
    [
      'GET',
      '/enrollments',
      ({ query }) =>
        ok(
          service.listEnrollments({
            companyId: query.get('companyId') ?? undefined,
            courseId: query.get('courseId') ?? undefined,
            learnerId: query.get('learnerId') ?? undefined,
            status: (query.get('status') as EnrollmentStatus | null) ?? undefined,
          }),
        ),
    ],
    ['GET', '/enrollments/:id', ({ params }) => ok(service.getEnrollment(params.id))],
    [
      'POST',
      '/enrollments/:id/lessons',
      ({ params, body }) => {
        const lesson = asObject(body).lesson;
        if (typeof lesson !== 'string') throw new ValidationError('lesson is required');
        return ok(service.completeLesson(params.id, lesson));
      },
    ],
    [
      'POST',
      '/enrollments/:id/assessment',
      ({ params, body }) => {
        const score = asObject(body).score;
        if (typeof score !== 'number') throw new ValidationError('score (number) is required');
        return ok(service.submitAssessment(params.id, score));
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
export function createRequestListener(service: TrainingService) {
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
