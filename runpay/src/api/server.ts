/**
 * Cardinal Payroll — a backend-for-frontend over the Payroll service.
 *
 * Surfaces:
 *   GET  /                → the self-contained Run Payroll single-page app
 *   GET  /health          → liveness
 *   GET  /api/app         → configured business { companyId, businessName } + meta
 *   POST /api/run-batch   → run one pay date across many employees, with totals
 *   /api/*                → transparently proxied to the Payroll service,
 *                           server-side, so the browser holds no credentials.
 *
 * The Payroll service does the real gross-to-net math (federal + NC, FICA,
 * employer taxes, YTD accumulation). This BFF adds the one thing an employer
 * console needs that a single-employee endpoint doesn't: run a whole pay period
 * at once and total it — total gross, total net, total employee withholding,
 * total employer tax, and the total cash to remit.
 *
 * On first use it ensures the company exists in Payroll (reusing one with the
 * same name so restarts against a durable Payroll store don't duplicate it), so
 * a fresh deployment opens to a usable, empty payroll for one company.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PAGE } from '../ui/page.ts';
import { ME_PAGE } from '../ui/me.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  payrollBase?: string;
  timeclockBase?: string;
  businessName?: string;
  jurisdiction?: string;
  /** Existing company id to use; when unset, one is created/reused on first use. */
  companyId?: string;
  apiKey?: string;
  /** Optional HTTP Basic auth gate (recommended when public); both required. */
  user?: string;
  password?: string;
  /** HMAC secret for employee self-service links. Set for stable links in prod. */
  tokenSecret?: string;
  fetchImpl?: typeof fetch;
}

interface Primary {
  companyId: string;
  businessName: string;
  jurisdiction: string;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const base = (opts.payrollBase ?? process.env.PAYROLL_URL ?? 'http://payroll:3500').replace(/\/$/, '');
  const timeBase = (opts.timeclockBase ?? process.env.TIMECLOCK_URL ?? 'http://timeclock:4800').replace(/\/$/, '');
  const businessName = opts.businessName ?? process.env.BUSINESS_NAME ?? 'Blue Ridge Press LLC';
  const jurisdiction = opts.jurisdiction ?? process.env.PAYROLL_JURISDICTION ?? 'raleigh_nc';
  const configuredId = opts.companyId ?? process.env.BUSINESS_COMPANY_ID;
  const apiKey = opts.apiKey ?? process.env.GATEWAY_API_KEY;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const authUser = opts.user ?? process.env.RUNPAY_USER;
  const authPassword = opts.password ?? process.env.RUNPAY_PASSWORD;
  const gate = authUser && authPassword ? { user: authUser, password: authPassword } : undefined;

  // Secret for signing employee self-service links. A per-process random
  // fallback keeps dev working (links just don't survive a restart); set
  // RUNPAY_TOKEN_SECRET in production so links stay valid.
  const tokenSecret = opts.tokenSecret ?? process.env.RUNPAY_TOKEN_SECRET ?? randomBytes(32).toString('hex');
  const signToken = (employeeId: string): string =>
    `${employeeId}.${createHmac('sha256', tokenSecret).update(employeeId).digest('hex')}`;
  const verifyToken = (token: string): string | null => {
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const employeeId = token.slice(0, dot);
    const expected = createHmac('sha256', tokenSecret).update(employeeId).digest('hex');
    const got = token.slice(dot + 1);
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return employeeId;
  };

  let primary: Primary | undefined;
  let ensuring: Promise<Primary> | undefined;

  function callerFor(target: string) {
    return async function call(method: string, path: string, body?: unknown): Promise<any> {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;
      const res = await fetchImpl(`${target}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (res.status >= 300) {
        const message = (json && json.error && json.error.message) || `HTTP ${res.status}`;
        throw new Error(message);
      }
      return json;
    };
  }
  const call = callerFor(base); // payroll
  const timeCall = callerFor(timeBase); // timeclock

  async function ensurePrimary(): Promise<Primary> {
    if (primary) return primary;
    if (!ensuring) {
      ensuring = (async () => {
        let companyId = configuredId;
        if (!companyId) {
          const existing = await call('GET', `/companies?name=${encodeURIComponent(businessName)}`);
          if (Array.isArray(existing) && existing.length > 0) {
            companyId = String(existing[0].id);
          } else {
            const co = await call('POST', '/companies', { name: businessName, jurisdiction });
            companyId = String(co.id);
          }
        }
        primary = { companyId, businessName, jurisdiction };
        return primary;
      })();
    }
    return ensuring;
  }

  const server = createServer(
    makeListener({ base, timeBase, apiKey, fetchImpl, ensurePrimary, call, timeCall, gate, signToken, verifyToken }),
  );
  return { server };
}

interface ListenerDeps {
  base: string;
  timeBase: string;
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
  ensurePrimary: () => Promise<Primary>;
  call: (method: string, path: string, body?: unknown) => Promise<any>;
  timeCall: (method: string, path: string, body?: unknown) => Promise<any>;
  gate: { user: string; password: string } | undefined;
  signToken: (employeeId: string) => string;
  verifyToken: (token: string) => string | null;
}

/**
 * Employee self-service links are public (the employee has no console login),
 * exactly like the health check — so the admin password gate must never apply.
 */
function isPublicPath(pathname: string): boolean {
  return pathname === '/health' || pathname.startsWith('/me/') || pathname.startsWith('/api/me/');
}

function makeListener(deps: ListenerDeps) {
  const { base, timeBase, apiKey, fetchImpl, ensurePrimary, call, timeCall, gate, signToken, verifyToken } = deps;
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';

      if (gate && !isPublicPath(url.pathname) && !authorized(req, gate)) {
        res.writeHead(401, {
          'www-authenticate': 'Basic realm="Cardinal Payroll", charset="UTF-8"',
          'content-type': 'application/json',
        });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'authentication required' } }));
        return;
      }

      if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      if (method === 'GET' && url.pathname.startsWith('/me/')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(ME_PAGE);
        return;
      }
      if (method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }

      // Employer mints a self-service link for one employee (admin, gated).
      const selflink = url.pathname.match(/^\/api\/employees\/([^/]+)\/selflink$/);
      if (method === 'GET' && selflink) {
        const employeeId = decodeURIComponent(selflink[1]);
        const employee = await call('GET', `/employees/${encodeURIComponent(employeeId)}`);
        const token = signToken(employee.id);
        return sendJson(res, 200, { token, path: `/me/${token}` });
      }

      // Employee reads their own profile + pay stubs by token (public, scoped).
      // Employee logs their own hours by token (public, scoped to them).
      const meHours = url.pathname.match(/^\/api\/me\/([^/]+)\/hours$/);
      if (method === 'POST' && meHours) {
        const employeeId = verifyToken(decodeURIComponent(meHours[1]));
        if (!employeeId) return sendJson(res, 401, { error: { code: 'invalid_token', message: 'link is not valid' } });
        const primary = await ensurePrimary();
        const b = (await readJson(req)) as { date?: string; hours?: number; note?: string };
        const entry = await timeCall('POST', '/entries', {
          companyId: primary.companyId,
          employeeId,
          date: b.date,
          hours: b.hours,
          note: b.note,
        });
        return sendJson(res, 201, entry);
      }
      // Employee reads their own profile + pay stubs + recent hours by token.
      const me = url.pathname.match(/^\/api\/me\/([^/]+)$/);
      if (method === 'GET' && me) {
        const employeeId = verifyToken(decodeURIComponent(me[1]));
        if (!employeeId) return sendJson(res, 401, { error: { code: 'invalid_token', message: 'link is not valid' } });
        const data = await meView(call, timeCall, employeeId);
        return sendJson(res, 200, data);
      }
      if (method === 'GET' && url.pathname === '/api/app') {
        const primary = await ensurePrimary();
        const meta = await call('GET', '/meta').catch(() => null);
        return sendJson(res, 200, { ...primary, meta });
      }
      if (method === 'POST' && url.pathname === '/api/run-batch') {
        const primary = await ensurePrimary();
        const body = (await readJson(req)) as RunBatchBody;
        const result = await runBatch(call, timeCall, primary.companyId, body);
        return sendJson(res, 200, result);
      }
      // Timesheets: proxied to the Timeclock service (add / list / delete hours).
      if (url.pathname.startsWith('/api/time/')) {
        const upstreamPath = url.pathname.slice('/api/time'.length); // "/api/time/entries" → "/entries"
        await proxyTo(timeBase, apiKey, fetchImpl, req, res, upstreamPath, url.search);
        return;
      }
      if (url.pathname.startsWith('/api/')) {
        await proxy(base, apiKey, fetchImpl, req, res, url);
        return;
      }

      sendJson(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) {
        sendJson(res, 502, { error: { code: 'upstream', message: `payroll unreachable: ${message}` } });
      } else {
        res.end();
      }
    }
  };
}

interface RunBatchBody {
  payDate?: string;
  /** Optional per-employee hours for hourly workers, keyed by employee id. */
  hours?: Record<string, number>;
  /** Optional subset of employee ids to pay; default is everyone at the company. */
  employeeIds?: string[];
  /** Optional pay-period range; hourly hours are pulled from the timeclock for it. */
  periodStart?: string;
  periodEnd?: string;
}

interface RunLine {
  employeeId: string;
  name: string;
  ok: boolean;
  payslip?: any;
  /** Where an hourly employee's hours came from: explicit input or the timeclock. */
  hoursSource?: 'entered' | 'timeclock';
  hours?: number;
  error?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Run one pay date across many employees and total it. Each employee is run
 * through the real Payroll engine; a failure on one (e.g. hourly with no hours)
 * is captured per-line and never aborts the batch.
 *
 * For an hourly employee whose hours weren't entered explicitly, and when a
 * pay-period range is given, the hours are pulled from the timeclock — so logged
 * time flows straight into the run.
 */
export async function runBatch(
  call: (method: string, path: string, body?: unknown) => Promise<any>,
  timeCall: (method: string, path: string, body?: unknown) => Promise<any>,
  companyId: string,
  body: RunBatchBody,
): Promise<{ payDate: string; lines: RunLine[]; totals: ReturnType<typeof emptyTotals> }> {
  const payDate = String(body?.payDate ?? '').trim();
  if (!ISO_DATE.test(payDate)) {
    throw new Error('payDate must be an ISO date (YYYY-MM-DD)');
  }
  const periodStart = String(body?.periodStart ?? '').trim();
  const periodEnd = String(body?.periodEnd ?? '').trim();
  const usePeriod = ISO_DATE.test(periodStart) && ISO_DATE.test(periodEnd);

  const employees: any[] = await call('GET', `/employees?companyId=${encodeURIComponent(companyId)}`);
  const wanted = Array.isArray(body?.employeeIds) && body.employeeIds.length
    ? employees.filter((e) => body.employeeIds!.includes(e.id))
    : employees;

  const lines: RunLine[] = [];
  const totals = emptyTotals();
  for (const emp of wanted) {
    const name = `${emp.firstName} ${emp.lastName}`;
    try {
      const runBody: { payDate: string; hours?: number } = { payDate };
      let hoursSource: RunLine['hoursSource'];
      const entered = body?.hours?.[emp.id];
      if (typeof entered === 'number') {
        runBody.hours = entered;
        hoursSource = 'entered';
      } else if (emp.payType === 'hourly' && usePeriod) {
        // Pull this employee's logged hours for the pay period from the timeclock.
        const sum = await timeCall('GET', `/summary?employeeId=${encodeURIComponent(emp.id)}&from=${periodStart}&to=${periodEnd}`);
        if (sum && typeof sum.hours === 'number' && sum.hours > 0) {
          runBody.hours = sum.hours;
          hoursSource = 'timeclock';
        }
      }
      const payslip = await call('POST', `/employees/${encodeURIComponent(emp.id)}/payroll`, runBody);
      addToTotals(totals, payslip);
      lines.push({ employeeId: emp.id, name, ok: true, payslip, hoursSource, hours: runBody.hours });
    } catch (err) {
      lines.push({ employeeId: emp.id, name, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { payDate, lines, totals };
}

/**
 * The employee self-service view: their profile and their own pay stubs, with
 * YTD totals. Scoped strictly to the (already token-verified) employee id — the
 * payslip query is always filtered to this one employee, so no link can ever
 * reveal anyone else's pay.
 */
export async function meView(
  call: (method: string, path: string, body?: unknown) => Promise<any>,
  timeCall: (method: string, path: string, body?: unknown) => Promise<any>,
  employeeId: string,
): Promise<{ employee: any; payslips: any[]; ytd: { grossCents: number; netCents: number }; entries: any[] }> {
  const employee = await call('GET', `/employees/${encodeURIComponent(employeeId)}`);
  const payslips: any[] = await call('GET', `/payslips?employeeId=${encodeURIComponent(employeeId)}`);
  payslips.sort((a, b) => (a.payDate < b.payDate ? 1 : -1));
  const ytd = payslips.reduce(
    (t, p) => ({ grossCents: t.grossCents + (p.grossCents ?? 0), netCents: t.netCents + (p.netCents ?? 0) }),
    { grossCents: 0, netCents: 0 },
  );
  // Recent logged hours (best-effort — an unreachable timeclock doesn't break the page).
  let entries: any[] = [];
  try {
    entries = await timeCall('GET', `/entries?employeeId=${encodeURIComponent(employeeId)}`);
    if (Array.isArray(entries)) entries = entries.slice(-30).reverse();
  } catch {
    entries = [];
  }
  // Return only what an employee should see (no employer-side ids beyond their own).
  const safeEmployee = {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    payType: employee.payType,
    payFrequency: employee.payFrequency,
    filingStatus: employee.filingStatus,
    annualSalaryCents: employee.annualSalaryCents,
    hourlyRateCents: employee.hourlyRateCents,
  };
  return { employee: safeEmployee, payslips, ytd, entries };
}

function emptyTotals() {
  return {
    employees: 0,
    grossCents: 0,
    employeeWithholdingCents: 0, // what's withheld from paychecks (fed + state + FICA)
    netCents: 0,
    employerTaxCents: 0, // employer FICA match + FUTA + SUTA
    totalRemittanceCents: 0, // employee withholding + employer tax = cash to send out
  };
}

function addToTotals(t: ReturnType<typeof emptyTotals>, slip: any): void {
  const emp = slip.employer ?? {};
  const employeeWithholding =
    (slip.socialSecurityCents ?? 0) +
    (slip.medicareCents ?? 0) +
    (slip.additionalMedicareCents ?? 0) +
    (slip.federalIncomeTaxCents ?? 0) +
    (slip.stateIncomeTaxCents ?? 0);
  const employerTax =
    (emp.socialSecurityCents ?? 0) +
    (emp.medicareCents ?? 0) +
    (emp.futaCents ?? 0) +
    (emp.sutaCents ?? 0);
  t.employees += 1;
  t.grossCents += slip.grossCents ?? 0;
  t.employeeWithholdingCents += employeeWithholding;
  t.netCents += slip.netCents ?? 0;
  t.employerTaxCents += employerTax;
  t.totalRemittanceCents += employeeWithholding + employerTax;
}

async function proxy(
  base: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  const upstreamPath = url.pathname.slice('/api'.length); // "/api/employees" → "/employees"
  await proxyTo(base, apiKey, fetchImpl, req, res, upstreamPath, url.search);
}

/** Proxy the current request to `base + path + search`, server-side. */
async function proxyTo(
  base: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  search: string,
): Promise<void> {
  const method = req.method ?? 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRaw(req);
  const upstream = await fetchImpl(`${base}${path}${search}`, { method, headers, body });
  const text = await upstream.text();
  res.writeHead(upstream.status, { 'content-type': 'application/json' });
  res.end(text);
}

async function readRaw(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const raw = await readRaw(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('request body is not valid JSON');
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage, gate: { user: string; password: string }): boolean {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  return safeEqual(decoded.slice(0, sep), gate.user) && safeEqual(decoded.slice(sep + 1), gate.password);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
