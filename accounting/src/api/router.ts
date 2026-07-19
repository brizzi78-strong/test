/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * A small route table maps `METHOD /path/:param` patterns to handlers; framing
 * (status codes, JSON encoding, DomainError translation) is handled here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { readTenant, scopeRequestToTenant, scopeResultToTenant } from './tenancy.ts';
import type { AccountType, InvoiceStatus } from '../domain/types.ts';
import { ACCOUNT_TYPES, INVOICE_STATUSES } from '../domain/types.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import type { AccountingService } from '../service/accountingService.ts';

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

export function buildRoutes(service: AccountingService): Route[] {
  const routes: Array<[string, string, Handler]> = [
    ['GET', '/health', () => ok({ status: 'ok' })],
    [
      'GET',
      '/meta',
      () => ok({ service: 'accounting', accountTypes: ACCOUNT_TYPES, invoiceStatuses: INVOICE_STATUSES }),
    ],

    ['POST', '/companies', ({ body }) => created(service.createCompany(asObject(body) as never))],

    ['POST', '/accounts', ({ body }) => created(service.createAccount(asObject(body) as never))],
    [
      'GET',
      '/accounts',
      ({ query }) =>
        ok(
          service.listAccounts({
            companyId: query.get('companyId') ?? undefined,
            type: (query.get('type') as AccountType | null) ?? undefined,
          }),
        ),
    ],
    ['GET', '/accounts/:id', ({ params }) => ok(service.getAccount(params.id))],

    ['POST', '/customers', ({ body }) => created(service.createCustomer(asObject(body) as never))],
    [
      'GET',
      '/customers',
      ({ query }) => ok(service.listCustomers({ companyId: query.get('companyId') ?? undefined })),
    ],
    ['GET', '/customers/:id', ({ params }) => ok(service.getCustomer(params.id))],

    ['POST', '/invoices', ({ body }) => created(service.createInvoice(asObject(body) as never))],
    [
      'GET',
      '/invoices',
      ({ query }) =>
        ok(
          service.listInvoices({
            companyId: query.get('companyId') ?? undefined,
            customerId: query.get('customerId') ?? undefined,
            status: (query.get('status') as InvoiceStatus | null) ?? undefined,
          }),
        ),
    ],
    ['GET', '/invoices/:id', ({ params }) => ok(service.getInvoice(params.id))],
    [
      'PATCH',
      '/invoices/:id',
      ({ params, body }) => ok(service.updateDraft(params.id, asObject(body) as never)),
    ],
    [
      'POST',
      '/invoices/:id/issue',
      ({ params, body }) => ok(service.issueInvoice(params.id, (body ?? {}) as never)),
    ],
    [
      'POST',
      '/invoices/:id/payments',
      ({ params, body }) => ok(service.recordPayment(params.id, asObject(body) as never)),
    ],
    [
      'POST',
      '/invoices/:id/void',
      ({ params, body }) => ok(service.voidInvoice(params.id, (body ?? {}) as never)),
    ],

    ['POST', '/expenses', ({ body }) => created(service.recordExpense(asObject(body) as never))],
    [
      'GET',
      '/expenses',
      ({ query }) =>
        ok(
          service.listExpenses({
            companyId: query.get('companyId') ?? undefined,
            accountId: query.get('accountId') ?? undefined,
          }),
        ),
    ],
    ['GET', '/expenses/:id', ({ params }) => ok(service.getExpense(params.id))],

    [
      'GET',
      '/reports/profit-and-loss',
      ({ query }) => {
        const companyId = query.get('companyId');
        if (!companyId) throw new ValidationError('companyId is required');
        return ok(
          service.profitAndLoss({
            companyId,
            from: query.get('from') ?? undefined,
            to: query.get('to') ?? undefined,
          }),
        );
      },
    ],
    [
      'GET',
      '/reports/accounts-receivable',
      ({ query }) => {
        const companyId = query.get('companyId');
        if (!companyId) throw new ValidationError('companyId is required');
        return ok(service.accountsReceivable({ companyId, asOf: query.get('asOf') ?? undefined }));
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
export function createRequestListener(service: AccountingService) {
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
