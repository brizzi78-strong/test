/**
 * The portal's HTTP server: a backend-for-frontend over the orchestrator.
 *
 * - `GET /`            → the self-contained admin SPA
 * - `GET /health`      → liveness
 * - `GET /api/meta`    → wired services
 * - `POST /api/companies`, `GET /api/companies/:id`
 * - `POST /api/companies/:id/hire`
 * - `GET /api/people`, `GET /api/people/:id`
 *
 * The `/api/*` endpoints proxy to the orchestrator via an injected client, so
 * the browser holds no credentials and there is no cross-origin traffic.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  clientFromEnv,
  UpstreamError,
  type HireInput,
  type OrchestratorClient,
} from '../upstream/orchestratorClient.ts';
import { PAGE } from '../ui/page.ts';

export interface AppServer {
  server: Server;
}

export interface AppOptions {
  client?: OrchestratorClient;
}

export function createApp(opts: AppOptions = {}): AppServer {
  const client = opts.client ?? clientFromEnv();
  const server = createServer(makeListener(client));
  return { server };
}

function makeListener(client: OrchestratorClient) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';

      if (method === 'GET' && (path === '/' || path === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      if (method === 'GET' && path === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }

      if (path.startsWith('/api/')) {
        return await handleApi(client, method, path.slice(4), url, req, res);
      }

      sendJson(res, 404, { error: { code: 'not_found', message: 'not found' } });
    } catch (err) {
      sendError(res, err);
    }
  };
}

async function handleApi(
  client: OrchestratorClient,
  method: string,
  apiPath: string,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // apiPath is the path with the leading `/api` removed, e.g. `/companies`.
  const seg = apiPath.split('/').filter((s) => s.length > 0);

  if (method === 'GET' && apiPath === '/meta') {
    return sendJson(res, 200, await client.meta());
  }
  if (method === 'POST' && apiPath === '/companies') {
    const body = await readJson(req);
    return sendJson(res, 201, await client.registerCompany(String(body.name ?? '')));
  }
  if (method === 'GET' && seg[0] === 'companies' && seg.length === 2) {
    return sendJson(res, 200, await client.getCompany(decodeURIComponent(seg[1])));
  }
  if (method === 'POST' && seg[0] === 'companies' && seg[2] === 'hire' && seg.length === 3) {
    const body = await readJson(req);
    return sendJson(res, 201, await client.hire(decodeURIComponent(seg[1]), body as unknown as HireInput));
  }
  if (method === 'GET' && apiPath === '/people') {
    const companyId = url.searchParams.get('companyId') ?? undefined;
    return sendJson(res, 200, await client.listPeople(companyId));
  }
  if (method === 'GET' && seg[0] === 'people' && seg.length === 2) {
    return sendJson(res, 200, await client.getPerson(decodeURIComponent(seg[1])));
  }

  sendJson(res, 404, { error: { code: 'not_found', message: 'unknown api route' } });
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new UpstreamError(400, 'request body is not valid JSON');
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}

function sendError(res: ServerResponse, err: unknown): void {
  const status = err instanceof UpstreamError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'internal error';
  sendJson(res, status, { error: { code: status === 500 ? 'internal' : 'upstream', message } });
}
