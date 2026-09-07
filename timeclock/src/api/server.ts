/**
 * Time & attendance HTTP server — a small JSON API over TimeclockService.
 *
 *   GET    /health                 liveness
 *   GET    /meta                   service descriptor
 *   POST   /entries                record hours { companyId, employeeId, date, hours, note? }
 *   GET    /entries?employeeId&companyId&from&to   list entries
 *   DELETE /entries/:id            remove an entry
 *   GET    /summary?employeeId&from&to             total hours for a pay period
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { TimeclockService } from '../service/timeclockService.ts';
import { DomainError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

export interface AppServer {
  server: Server;
  service: TimeclockService;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.TIMECLOCK_DB ? createSqliteStore(env.TIMECLOCK_DB) : createInMemoryStore();
}

export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new TimeclockService({ store });
  const server = createServer(makeListener(service));
  return { server, service };
}

function makeListener(service: TimeclockService) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const method = req.method ?? 'GET';
      const q = url.searchParams;
      const seg = path.split('/').filter(Boolean);

      if (method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });
      if (method === 'GET' && path === '/meta') return json(res, 200, { service: 'timeclock' });

      if (method === 'POST' && path === '/entries') {
        const body = (await readJson(req)) as never;
        return json(res, 201, service.addEntry(body));
      }
      if (method === 'GET' && path === '/entries') {
        return json(res, 200, service.listEntries({
          employeeId: q.get('employeeId') ?? undefined,
          companyId: q.get('companyId') ?? undefined,
          from: q.get('from') ?? undefined,
          to: q.get('to') ?? undefined,
        }));
      }
      if (method === 'DELETE' && seg[0] === 'entries' && seg[1] && seg.length === 2) {
        service.deleteEntry(decodeURIComponent(seg[1]));
        return json(res, 200, { ok: true });
      }
      if (method === 'GET' && path === '/summary') {
        const employeeId = q.get('employeeId') ?? '';
        const from = q.get('from') ?? '';
        const to = q.get('to') ?? '';
        return json(res, 200, service.summary(employeeId, from, to));
      }

      json(res, 404, { error: { code: 'not_found', message: 'route not found' } });
    } catch (err) {
      if (err instanceof DomainError) return json(res, err.status, { error: { code: err.code, message: err.message } });
      const message = err instanceof Error ? err.message : 'internal error';
      if (!res.headersSent) json(res, 500, { error: { code: 'internal', message } });
      else res.end();
    }
  };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError('request body is not valid JSON');
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
}
