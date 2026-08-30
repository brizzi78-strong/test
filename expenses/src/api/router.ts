/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * Routes:
 *   GET    /health
 *   GET    /                                   -> web app (src/web/index.html)
 *   GET    /policy                             -> active expense policy
 *   POST   /reports                            -> create a draft report
 *   GET    /reports                            -> list this user's reports
 *   GET    /reports/:id                        -> report + live policy evaluation
 *   DELETE /reports/:id                        -> delete a draft
 *   POST   /reports/:id/expenses               -> add an expense
 *   PUT    /reports/:id/expenses/:expenseId    -> update an expense
 *   DELETE /reports/:id/expenses/:expenseId    -> remove an expense
 *   POST   /reports/:id/submit                 -> submit (auto-approves when compliant)
 *   POST   /reports/:id/reopen                 -> back to draft (submitted/rejected)
 *   GET    /approvals                          -> reports waiting on my approval
 *   GET    /reimbursements                     -> approved reports I can pay out
 *   POST   /reports/:id/approve
 *   POST   /reports/:id/reject                 -> { reason }
 *   POST   /reports/:id/reimburse
 *   GET    /analytics                          -> my spend by category/status
 *   GET    /export.csv[?scope=approvals]       -> my expenses (or my queue) as CSV
 *   GET    /budgets                            -> my monthly category budgets
 *   PUT    /budgets/:category                  -> { amountCents, rollover?, startMonth? }
 *   DELETE /budgets/:category
 *   GET    /budgets/summary[?month=YYYY-MM]    -> budget progress for a month
 *   POST   /card-transactions/import           -> { transactions: [...] } card feed import
 *   GET    /card-transactions[?status=...]     -> my card feed
 *   POST   /card-transactions/:id/expense      -> one-click expense from a charge
 *   POST   /card-transactions/:id/dismiss      -> personal spend, not expensable
 *   POST   /card-transactions/:id/restore      -> undo a dismissal
 *
 * The requester is identified by the `x-user-id` header (default "demo") —
 * lightweight tenancy in the same spirit as the other apps in this repo.
 */

import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DomainError } from '../service/errors.ts';
import type { ExpenseService } from '../service/expenseService.ts';

export interface ListenerOptions {
  /** Optional HTTP Basic auth gate (recommended when public); both required. */
  gate?: { user: string; password: string };
  /** Display name substituted into the web app's title and header. */
  brandName?: string;
}

interface Ctx {
  userId: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

interface RouteResult {
  status: number;
  body: unknown;
  /** Defaults to application/json; set for raw responses such as CSV. */
  contentType?: string;
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
  service: ExpenseService,
  webIndexPath: URL,
  opts: ListenerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const routes: Route[] = [];
  const route = (method: string, path: string, handler: Handler): void => {
    routes.push({ method, segments: path.split('/').filter(Boolean), handler });
  };

  route('GET', '/health', () => ok({ status: 'ok' }));
  route('GET', '/policy', () => ok({ policy: service.policy }));
  route('POST', '/reports', (ctx) => created(service.createReport(ctx.userId, ctx.body ?? {})));
  route('GET', '/reports', (ctx) => ok({ reports: service.listReports(ctx.userId) }));
  route('GET', '/reports/:id', (ctx) => ok(service.getReport(ctx.userId, ctx.params.id!)));
  route('DELETE', '/reports/:id', (ctx) => {
    service.deleteReport(ctx.userId, ctx.params.id!);
    return ok({ deleted: true });
  });
  route('POST', '/reports/:id/expenses', (ctx) =>
    created(service.addExpense(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/reports/:id/expenses/:expenseId', (ctx) =>
    ok(service.updateExpense(ctx.userId, ctx.params.id!, ctx.params.expenseId!, ctx.body)),
  );
  route('DELETE', '/reports/:id/expenses/:expenseId', (ctx) =>
    ok(service.deleteExpense(ctx.userId, ctx.params.id!, ctx.params.expenseId!)),
  );
  route('POST', '/reports/:id/submit', (ctx) => ok(service.submitReport(ctx.userId, ctx.params.id!)));
  route('POST', '/reports/:id/reopen', (ctx) => ok(service.reopenReport(ctx.userId, ctx.params.id!)));
  route('GET', '/approvals', (ctx) => ok({ reports: service.listApprovals(ctx.userId) }));
  route('GET', '/reimbursements', (ctx) => ok({ reports: service.listReimbursable(ctx.userId) }));
  route('GET', '/export.csv', (ctx) => ({
    status: 200,
    body: service.exportCsv(ctx.userId, ctx.query.get('scope') === 'approvals' ? 'approvals' : 'mine'),
    contentType: 'text/csv',
  }));
  route('POST', '/reports/:id/approve', (ctx) => ok(service.approveReport(ctx.userId, ctx.params.id!)));
  route('POST', '/reports/:id/reject', (ctx) =>
    ok(service.rejectReport(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('POST', '/reports/:id/reimburse', (ctx) =>
    ok(service.reimburseReport(ctx.userId, ctx.params.id!)),
  );
  route('GET', '/analytics', (ctx) => ok(service.analytics(ctx.userId)));
  // Registered before /budgets/:category so "summary" is never read as a category.
  route('GET', '/budgets/summary', (ctx) =>
    ok(service.budgetSummary(ctx.userId, ctx.query.get('month') ?? undefined)),
  );
  route('GET', '/budgets', (ctx) => ok({ budgets: service.listBudgets(ctx.userId) }));
  route('PUT', '/budgets/:category', (ctx) =>
    ok({ budget: service.setBudget(ctx.userId, ctx.params.category!, ctx.body) }),
  );
  route('DELETE', '/budgets/:category', (ctx) => {
    service.deleteBudget(ctx.userId, ctx.params.category!);
    return ok({ deleted: true });
  });
  route('POST', '/card-transactions/import', (ctx) =>
    created(service.importTransactions(ctx.userId, ctx.body)),
  );
  route('GET', '/card-transactions', (ctx) => {
    const status = ctx.query.get('status');
    if (status !== null && status !== 'unmatched' && status !== 'matched' && status !== 'dismissed') {
      return { status: 400, body: { error: 'status must be unmatched, matched, or dismissed' } };
    }
    return ok({ transactions: service.listTransactions(ctx.userId, status ?? undefined) });
  });
  route('POST', '/card-transactions/:id/expense', (ctx) =>
    created(service.expenseFromTransaction(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('POST', '/card-transactions/:id/dismiss', (ctx) =>
    ok({ transaction: service.dismissTransaction(ctx.userId, ctx.params.id!) }),
  );
  route('POST', '/card-transactions/:id/restore', (ctx) =>
    ok({ transaction: service.restoreTransaction(ctx.userId, ctx.params.id!) }),
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
        'www-authenticate': `Basic realm="${opts.brandName ?? 'Expenses'}"`,
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
            .replace('<title>Expenses', `<title>${opts.brandName}`)
            .replace('<h1>Expenses<', `<h1>${opts.brandName}<`);
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
        const result = found.handler({ userId, params: found.params, query: url.searchParams, body });
        send(result.status, result.body, result.contentType ?? 'application/json');
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
