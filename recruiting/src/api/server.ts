/**
 * HTTP server wiring: assemble a RecruitingService with an in-memory store and
 * expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { RecruitingService } from '../service/recruitingService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: RecruitingService;
}

/**
 * Select a store from the environment: `RECRUITING_DB=/path/to/data.db` uses the
 * durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.RECRUITING_DB ? createSqliteStore(env.RECRUITING_DB) : createInMemoryStore();
}

/**
 * Create (but do not start) an HTTP server. The store defaults to the
 * environment selection; pass one explicitly (e.g. in tests) to override.
 * Callers start it with `server.listen(port)`.
 */
export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new RecruitingService({ store });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
