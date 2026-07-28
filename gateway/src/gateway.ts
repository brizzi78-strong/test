/**
 * The API gateway request handler.
 *
 * Responsibilities:
 *   - `GET /health` — unauthenticated liveness probe
 *   - `/*` — authenticate the API key, resolve its tenant, rate-limit, and
 *     reverse-proxy to the selected service, injecting a trusted `X-Company-Id`
 *   - `/admin/keys` — issue and list API keys (guarded by an admin token)
 *
 * This adds authentication at the edge. Each service then enforces per-tenant
 * data isolation from the injected `X-Gateway-Tenant`: it stamps writes with the
 * tenant, constrains list reads to it, and hides other tenants' records — so a
 * key issued for one company can never read or write another's data, regardless
 * of the company id in the request body (see each service's `api/tenancy.ts`).
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  generateApiKey,
  maskKey,
  readPresentedKey,
  type ApiKey,
  type KeyStore,
} from './auth.ts';
import { proxyRequest } from './proxy.ts';
import type { RouteTable } from './routes.ts';
import type { RateLimiter } from './rateLimit.ts';

export interface GatewayOptions {
  keyStore: KeyStore;
  routes: RouteTable;
  rateLimiter: RateLimiter;
  /** If set, `/admin/*` requires `X-Admin-Token: <adminToken>`. If unset, admin is disabled. */
  adminToken?: string;
  now?: () => Date;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}

/** Thrown when a request body isn't valid JSON, so the caller can answer 400. */
class BadRequestError extends Error {}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new BadRequestError('request body is not valid JSON');
  }
}

export function createGateway(opts: GatewayOptions): Server {
  const now = opts.now ?? (() => new Date());

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://gateway.local');
      const segments = url.pathname.split('/').filter((s) => s.length > 0);

      // --- health (no auth) ---
      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      // --- admin: issue / list keys ---
      if (segments[0] === 'admin') {
        if (!opts.adminToken) {
          sendJson(res, 403, { error: { code: 'admin_disabled', message: 'admin API is not enabled' } });
          return;
        }
        if (req.headers['x-admin-token'] !== opts.adminToken) {
          sendJson(res, 403, { error: { code: 'forbidden', message: 'invalid admin token' } });
          return;
        }
        if (segments[1] === 'keys' && req.method === 'POST') {
          const body = ((await readJson(req)) ?? {}) as { companyId?: unknown; name?: unknown };
          const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : '';
          const name = typeof body.name === 'string' ? body.name.trim() : '';
          if (!companyId || !name) {
            sendJson(res, 400, { error: { code: 'validation', message: 'companyId and name are required' } });
            return;
          }
          const entry: ApiKey = { key: generateApiKey(), companyId, name, createdAt: now().toISOString() };
          opts.keyStore.put(entry);
          sendJson(res, 201, entry); // returned once, in full, at creation
          return;
        }
        if (segments[1] === 'keys' && req.method === 'GET') {
          sendJson(
            res,
            200,
            opts.keyStore.list().map((k) => ({ key: maskKey(k.key), companyId: k.companyId, name: k.name, createdAt: k.createdAt })),
          );
          return;
        }
        sendJson(res, 404, { error: { code: 'not_found', message: 'unknown admin route' } });
        return;
      }

      // --- proxied service traffic (authenticated) ---
      const service = segments[0];
      if (!service || !(service in opts.routes)) {
        sendJson(res, 404, { error: { code: 'unknown_service', message: `no such service: ${service ?? ''}` } });
        return;
      }

      const presented = readPresentedKey(req.headers);
      if (!presented) {
        sendJson(res, 401, { error: { code: 'unauthenticated', message: 'missing API key (Authorization: Bearer … or X-API-Key)' } });
        return;
      }
      const apiKey = opts.keyStore.get(presented);
      if (!apiKey) {
        sendJson(res, 401, { error: { code: 'invalid_key', message: 'invalid API key' } });
        return;
      }
      if (!opts.rateLimiter.allow(apiKey.key)) {
        sendJson(res, 429, { error: { code: 'rate_limited', message: 'too many requests' } });
        return;
      }

      const upstreamPath = '/' + segments.slice(1).join('/') + url.search;
      proxyRequest(req, res, opts.routes[service], upstreamPath, {
        'x-company-id': apiKey.companyId,
        'x-gateway-tenant': apiKey.companyId,
        'x-gateway-authenticated': 'true',
      });
    } catch (err) {
      if (err instanceof BadRequestError) {
        if (!res.headersSent) sendJson(res, 400, { error: { code: 'bad_request', message: err.message } });
        else res.end();
        return;
      }
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) sendJson(res, 500, { error: { code: 'internal', message } });
      else res.end();
    }
  });
}
