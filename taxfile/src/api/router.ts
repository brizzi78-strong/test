/**
 * Zero-dependency HTTP router over Node's built-in http module.
 *
 * Routes:
 *   GET    /health
 *   GET    /                              -> web app (src/web/index.html)
 *   POST   /auth/register                 -> create account, returns session token
 *   POST   /auth/login
 *   POST   /auth/logout
 *   GET    /auth/me                       -> current account + plan
 *   POST   /billing/upgrade               -> Stripe Checkout URL, or instant in dev mode
 *   POST   /billing/webhook               -> Stripe events (signature-verified, gate-exempt)
 *   POST   /returns                       -> start a return ({taxYear} optional: 2025|2026)
 *   GET    /returns                       -> list this user's returns
 *   GET    /returns/:id                   -> return + live computation + scope
 *   DELETE /returns/:id
 *   PUT    /returns/:id/personal
 *   PUT    /returns/:id/filing-status
 *   PUT    /returns/:id/situations        -> declared out-of-scope situations
 *   PUT    /returns/:id/dependents
 *   PUT    /returns/:id/income
 *   PUT    /returns/:id/deductions
 *   GET    /returns/:id/review            -> computation + scope + finalization blockers
 *   GET    /returns/:id/scenarios         -> Pro: planning scenarios (402 on free plan)
 *   POST   /returns/:id/file              -> finalize the estimate (transmits nothing)
 *
 * Identity: `Authorization: Bearer <token>` from /auth/login wins; otherwise
 * the `x-user-id` header (default "demo") — the sessionless dev/demo mode.
 */

import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DomainError } from '../service/errors.ts';
import type { AccountService } from '../service/accountService.ts';
import type { BillingService } from '../service/billingService.ts';
import type { TaxReturnService } from '../service/taxReturnService.ts';

export interface Services {
  returns: TaxReturnService;
  accounts: AccountService;
  billing: BillingService;
}

export interface ListenerOptions {
  /** Optional HTTP Basic auth gate (recommended when public); both required. */
  gate?: { user: string; password: string };
  /** Display name substituted into the web app's title and header. */
  brandName?: string;
}

interface Ctx {
  userId: string;
  token: string | undefined;
  params: Record<string, string>;
  body: unknown;
  rawBody: string;
  headers: IncomingMessage['headers'];
}

interface RouteResult {
  status: number;
  body: unknown;
}

type Handler = (ctx: Ctx) => RouteResult | Promise<RouteResult>;

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
  services: Services,
  webIndexPath: URL,
  opts: ListenerOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const { returns, accounts, billing } = services;
  const routes: Route[] = [];
  const route = (method: string, path: string, handler: Handler): void => {
    routes.push({ method, segments: path.split('/').filter(Boolean), handler });
  };

  route('GET', '/health', () => ok({ status: 'ok' }));

  // --- accounts ---------------------------------------------------------
  route('POST', '/auth/register', (ctx) => created(accounts.register(ctx.body)));
  route('POST', '/auth/login', (ctx) => ok(accounts.login(ctx.body)));
  route('POST', '/auth/logout', (ctx) => {
    if (ctx.token) accounts.logout(ctx.token);
    return ok({ loggedOut: true });
  });
  route('GET', '/auth/me', (ctx) =>
    ok({
      user: accounts.getUser(ctx.userId) ?? { id: ctx.userId, plan: accounts.planFor(ctx.userId) },
      plan: accounts.planFor(ctx.userId),
    }),
  );

  // --- billing ----------------------------------------------------------
  route('POST', '/billing/upgrade', async (ctx) => ok(await billing.upgrade(ctx.userId)));
  route('POST', '/billing/webhook', (ctx) => {
    const applied = billing.handleWebhook(
      ctx.rawBody,
      ctx.headers['stripe-signature'] as string | undefined,
    );
    return ok({ received: true, applied });
  });

  // --- returns ----------------------------------------------------------
  route('POST', '/returns', (ctx) => created(returns.createReturn(ctx.userId, ctx.body)));
  route('GET', '/returns', (ctx) => ok({ returns: returns.listReturns(ctx.userId) }));
  route('GET', '/returns/:id', (ctx) => ok(returns.getReturn(ctx.userId, ctx.params.id!)));
  route('DELETE', '/returns/:id', (ctx) => {
    returns.deleteReturn(ctx.userId, ctx.params.id!);
    return ok({ deleted: true });
  });
  route('PUT', '/returns/:id/personal', (ctx) =>
    ok(returns.updatePersonal(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/filing-status', (ctx) =>
    ok(returns.updateFilingStatus(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/situations', (ctx) =>
    ok(returns.updateSituations(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/dependents', (ctx) =>
    ok(returns.updateDependents(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/income', (ctx) =>
    ok(returns.updateIncome(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('PUT', '/returns/:id/deductions', (ctx) =>
    ok(returns.updateDeductions(ctx.userId, ctx.params.id!, ctx.body)),
  );
  route('GET', '/returns/:id/review', (ctx) => {
    const { taxReturn, computation, scope } = returns.getReturn(ctx.userId, ctx.params.id!);
    return ok({
      taxReturn,
      computation,
      scope,
      fileBlockers: returns.fileBlockers(taxReturn),
      plan: accounts.planFor(ctx.userId),
    });
  });
  route('GET', '/returns/:id/scenarios', (ctx) => {
    billing.requirePro(ctx.userId);
    return ok({ scenarios: returns.scenarios(ctx.userId, ctx.params.id!) });
  });
  route('POST', '/returns/:id/file', (ctx) =>
    ok(returns.fileReturn(ctx.userId, ctx.params.id!)),
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

    // Health stays open for the platform probe; the Stripe webhook cannot
    // send Basic credentials, so it is gate-exempt and relies on its own
    // signature verification instead.
    const gateExempt = url.pathname === '/health' || url.pathname === '/billing/webhook';
    if (opts.gate && !gateExempt && !authorized(req, opts.gate)) {
      // A Bearer session from /auth/login also passes the gate.
      const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (!services.accounts.resolveSession(bearer)) {
        res.writeHead(401, {
          'www-authenticate': `Basic realm="${opts.brandName ?? 'TaxFile'}"`,
          'content-type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify({ error: 'authentication required' }));
        return;
      }
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
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let body: unknown = undefined;
      if (rawBody.length > 0 && url.pathname !== '/billing/webhook') {
        try {
          body = JSON.parse(rawBody);
        } catch {
          send(400, { error: 'request body must be valid JSON' });
          return;
        }
      }

      const auth = req.headers.authorization ?? '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
      const sessionUser = accounts.resolveSession(token);
      const userId = sessionUser ?? String(req.headers['x-user-id'] ?? 'demo');

      Promise.resolve()
        .then(() =>
          found.handler({ userId, token, params: found.params, body, rawBody, headers: req.headers }),
        )
        .then((result) => send(result.status, result.body))
        .catch((err: unknown) => {
          if (err instanceof DomainError) send(err.status, { error: err.message });
          else {
            send(500, { error: 'internal error' });
            // eslint-disable-next-line no-console
            console.error(err);
          }
        });
    });
  };
}
