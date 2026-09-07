/**
 * Client-facing booking site — a NARROW, public backend-for-frontend over the
 * Booking service.
 *
 * Unlike the internal schedule UI (which proxies everything), this server
 * exposes only what a member of the public may safely do for one configured
 * business:
 *   - `GET /`             → the self-contained booking page
 *   - `GET /health`       → liveness
 *   - `GET /api/services` → the business's service menu (name, duration, price)
 *   - `POST /api/book`    → create a *requested* appointment (the business
 *                           confirms it later from the schedule)
 *
 * There is no path to read the schedule, other clients, workers, or to
 * confirm/cancel anything. The company id is fixed by configuration, never
 * chosen by the caller.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { renderPage } from '../ui/page.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  bookingBase?: string;
  companyId?: string;
  businessName?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

interface Config {
  bookingBase: string;
  companyId: string | undefined;
  businessName: string;
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const cfg: Config = {
    bookingBase: (opts.bookingBase ?? process.env.BOOKING_URL ?? 'http://booking:4100').replace(/\/$/, ''),
    companyId: opts.companyId ?? process.env.BUSINESS_COMPANY_ID,
    businessName: opts.businessName ?? process.env.BUSINESS_NAME ?? 'Our Studio',
    apiKey: opts.apiKey ?? process.env.GATEWAY_API_KEY,
    fetchImpl: opts.fetchImpl ?? fetch,
  };
  return { server: createServer(makeListener(cfg)) };
}

function makeListener(cfg: Config) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = req.method ?? 'GET';
      const path = url.pathname;

      if (method === 'GET' && (path === '/' || path === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(renderPage(cfg.businessName));
        return;
      }
      if (method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });

      if (!cfg.companyId) {
        return json(res, 503, { error: { code: 'not_configured', message: 'booking is not configured yet' } });
      }
      if (method === 'GET' && path === '/api/services') return await listServices(cfg, res);
      if (method === 'POST' && path === '/api/book') return await book(cfg, req, res);

      json(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) json(res, 502, { error: { code: 'upstream', message } });
      else res.end();
    }
  };
}

async function listServices(cfg: Config, res: ServerResponse): Promise<void> {
  const upstream = await call(cfg, 'GET', `/services?companyId=${encodeURIComponent(cfg.companyId!)}`);
  const services = Array.isArray(upstream.body) ? upstream.body : [];
  // Expose only the public menu fields.
  const menu = services.map((s: Record<string, unknown>) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
  }));
  json(res, 200, menu);
}

async function book(cfg: Config, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readJson(req)) as Record<string, unknown>;
  let serviceId = typeof body.serviceId === 'string' && body.serviceId ? body.serviceId : '';
  const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
  const start = typeof body.start === 'string' ? body.start : '';
  if (!clientName || !start) {
    return json(res, 400, { error: { code: 'validation', message: 'name and time are required' } });
  }
  // No service picker on the page: book into the business's service (the first
  // one configured). The service still sets the appointment's duration.
  if (!serviceId) {
    const svcRes = await call(cfg, 'GET', `/services?companyId=${encodeURIComponent(cfg.companyId!)}`);
    const list = Array.isArray(svcRes.body) ? (svcRes.body as Array<Record<string, unknown>>) : [];
    if (!list.length) {
      return json(res, 400, { error: { code: 'no_service', message: 'online booking is not available yet' } });
    }
    serviceId = String(list[0].id);
  }
  const upstream = await call(cfg, 'POST', '/appointments', {
    companyId: cfg.companyId,
    serviceId,
    clientName,
    clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone.trim() : undefined,
    address: typeof body.address === 'string' ? body.address.trim() : undefined,
    notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
    start,
  });
  if (upstream.status >= 300) {
    return json(res, upstream.status, upstream.body);
  }
  const appt = upstream.body as Record<string, unknown>;
  // Confirmation only — don't leak internal ids or other fields.
  json(res, 201, { status: 'requested', serviceName: appt.serviceName, start: appt.start, end: appt.end });
}

async function call(cfg: Config, method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`;
  const res = await cfg.fetchImpl(`${cfg.bookingBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => ({}));
  return { status: res.status, body: parsed };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}
