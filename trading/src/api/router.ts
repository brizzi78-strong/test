/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * A small route table maps `METHOD /path/:param` patterns to handlers; framing
 * (status codes, JSON encoding, DomainError translation) is handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OrderStatus } from '../domain/types.ts';
import { ORDER_SIDES, ORDER_STATUSES, ORDER_TYPES } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { TradingService } from '../service/tradingService.ts';

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

function numberOrUndefined(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function buildRoutes(service: TradingService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    [
      'GET',
      '/meta',
      () =>
        ok({
          service: 'trading',
          marketData: service.marketDataName,
          orderSides: ORDER_SIDES,
          orderTypes: ORDER_TYPES,
          orderStatuses: ORDER_STATUSES,
        }),
    ],

    ['POST', '/accounts', ({ body }) => created(service.createAccount(asObject(body) as never))],
    ['GET', '/accounts', ({ query }) => ok(service.listAccounts({ name: query.get('name') ?? undefined }))],
    ['GET', '/accounts/:id', ({ params }) => ok(service.getAccount(params.id))],

    ['GET', '/instruments', () => ok(service.listInstruments())],
    ['GET', '/instruments/:symbol', ({ params }) => ok(service.getInstrument(params.symbol))],

    ['GET', '/quotes', async () => ok(await service.listQuotes())],
    ['GET', '/quotes/:symbol', async ({ params }) => ok(await service.getQuote(params.symbol))],
    [
      'GET',
      '/quotes/:symbol/history',
      async ({ params, query }) =>
        ok(
          await service.getHistory(params.symbol, {
            points: numberOrUndefined(query.get('points')),
            intervalMinutes: numberOrUndefined(query.get('intervalMinutes')),
          }),
        ),
    ],

    ['POST', '/orders', async ({ body }) => created(await service.placeOrder(asObject(body) as never))],
    [
      'GET',
      '/orders',
      async ({ query }) =>
        ok(
          await service.listOrders({
            accountId: query.get('accountId') ?? undefined,
            status: (query.get('status') as OrderStatus | null) ?? undefined,
            symbol: query.get('symbol') ?? undefined,
          }),
        ),
    ],
    ['GET', '/orders/:id', ({ params }) => ok(service.getOrder(params.id))],
    ['POST', '/orders/:id/cancel', ({ params }) => ok(service.cancelOrder(params.id))],

    ['POST', '/plans', async ({ body }) => created(await service.createPlan(asObject(body) as never))],
    ['GET', '/plans', async ({ query }) => ok(await service.listPlans({ accountId: query.get('accountId') ?? undefined }))],
    ['GET', '/plans/:id', ({ params }) => ok(service.getPlan(params.id))],
    ['POST', '/plans/:id/pause', ({ params }) => ok(service.setPlanActive(params.id, false))],
    ['POST', '/plans/:id/resume', ({ params }) => ok(service.setPlanActive(params.id, true))],
    [
      'DELETE',
      '/plans/:id',
      ({ params }) => {
        service.deletePlan(params.id);
        return ok({ removed: true });
      },
    ],

    ['GET', '/portfolio/:accountId', async ({ params }) => ok(await service.getPortfolio(params.accountId))],
    [
      'GET',
      '/portfolio/:accountId/history',
      async ({ params, query }) =>
        ok(
          await service.getPortfolioHistory(params.accountId, {
            points: numberOrUndefined(query.get('points')),
            intervalMinutes: numberOrUndefined(query.get('intervalMinutes')),
          }),
        ),
    ],
    ['GET', '/realized-pnl/:accountId', ({ params }) => ok(service.getRealizedPnl(params.accountId))],

    ['GET', '/watchlist/:accountId', async ({ params }) => ok(await service.listWatchlist(params.accountId))],
    [
      'POST',
      '/watchlist/:accountId',
      ({ params, body }) => created(service.addToWatchlist(params.accountId, asObject(body).symbol as string)),
    ],
    [
      'DELETE',
      '/watchlist/:accountId/:symbol',
      ({ params }) => {
        service.removeFromWatchlist(params.accountId, params.symbol);
        return ok({ removed: true });
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
export function createRequestListener(service: TradingService) {
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

      const body = req.method === 'GET' || req.method === 'DELETE' ? undefined : await readJsonBody(req);
      const result = await match.route.handler({ params: match.params, query: url.searchParams, body });
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
