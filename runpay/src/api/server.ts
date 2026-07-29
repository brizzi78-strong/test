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
import { timingSafeEqual } from 'node:crypto';
import { PAGE } from '../ui/page.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  payrollBase?: string;
  businessName?: string;
  jurisdiction?: string;
  /** Existing company id to use; when unset, one is created/reused on first use. */
  companyId?: string;
  apiKey?: string;
  /** Optional HTTP Basic auth gate (recommended when public); both required. */
  user?: string;
  password?: string;
  fetchImpl?: typeof fetch;
}

interface Primary {
  companyId: string;
  businessName: string;
  jurisdiction: string;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const base = (opts.payrollBase ?? process.env.PAYROLL_URL ?? 'http://payroll:3500').replace(/\/$/, '');
  const businessName = opts.businessName ?? process.env.BUSINESS_NAME ?? 'Blue Ridge Press LLC';
  const jurisdiction = opts.jurisdiction ?? process.env.PAYROLL_JURISDICTION ?? 'raleigh_nc';
  const configuredId = opts.companyId ?? process.env.BUSINESS_COMPANY_ID;
  const apiKey = opts.apiKey ?? process.env.GATEWAY_API_KEY;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const authUser = opts.user ?? process.env.RUNPAY_USER;
  const authPassword = opts.password ?? process.env.RUNPAY_PASSWORD;
  const gate = authUser && authPassword ? { user: authUser, password: authPassword } : undefined;

  let primary: Primary | undefined;
  let ensuring: Promise<Primary> | undefined;

  async function call(method: string, path: string, body?: unknown): Promise<any> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const res = await fetchImpl(`${base}${path}`, {
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
  }

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

  const server = createServer(makeListener({ base, apiKey, fetchImpl, ensurePrimary, call, gate }));
  return { server };
}

interface ListenerDeps {
  base: string;
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
  ensurePrimary: () => Promise<Primary>;
  call: (method: string, path: string, body?: unknown) => Promise<any>;
  gate: { user: string; password: string } | undefined;
}

function makeListener(deps: ListenerDeps) {
  const { base, apiKey, fetchImpl, ensurePrimary, call, gate } = deps;
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';

      if (gate && url.pathname !== '/health' && !authorized(req, gate)) {
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
      if (method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }
      if (method === 'GET' && url.pathname === '/api/app') {
        const primary = await ensurePrimary();
        const meta = await call('GET', '/meta').catch(() => null);
        return sendJson(res, 200, { ...primary, meta });
      }
      if (method === 'POST' && url.pathname === '/api/run-batch') {
        const primary = await ensurePrimary();
        const body = (await readJson(req)) as RunBatchBody;
        const result = await runBatch(call, primary.companyId, body);
        return sendJson(res, 200, result);
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
}

interface RunLine {
  employeeId: string;
  name: string;
  ok: boolean;
  payslip?: any;
  error?: string;
}

/**
 * Run one pay date across many employees and total it. Each employee is run
 * through the real Payroll engine; a failure on one (e.g. hourly with no hours)
 * is captured per-line and never aborts the batch.
 */
export async function runBatch(
  call: (method: string, path: string, body?: unknown) => Promise<any>,
  companyId: string,
  body: RunBatchBody,
): Promise<{ payDate: string; lines: RunLine[]; totals: ReturnType<typeof emptyTotals> }> {
  const payDate = String(body?.payDate ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
    throw new Error('payDate must be an ISO date (YYYY-MM-DD)');
  }
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
      const h = body?.hours?.[emp.id];
      if (typeof h === 'number') runBody.hours = h;
      const payslip = await call('POST', `/employees/${encodeURIComponent(emp.id)}/payroll`, runBody);
      addToTotals(totals, payslip);
      lines.push({ employeeId: emp.id, name, ok: true, payslip });
    } catch (err) {
      lines.push({ employeeId: emp.id, name, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { payDate, lines, totals };
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
  const target = `${base}${upstreamPath}${url.search}`;
  const method = req.method ?? 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRaw(req);
  const upstream = await fetchImpl(target, { method, headers, body });
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
