/**
 * HTTP server wiring: assemble an OffboardingService with a store (in-memory or
 * the durable SQLite store, selected by env) and expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { OffboardingService } from '../service/offboardingService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: OffboardingService;
}

/**
 * Select a store from the environment: `OFFBOARDING_DB=/path/to/data.db` uses
 * the durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.OFFBOARDING_DB ? createSqliteStore(env.OFFBOARDING_DB) : createInMemoryStore();
}

/**
 * Create (but do not start) an HTTP server. The store defaults to the
 * environment selection; pass one explicitly (e.g. in tests) to override.
 * Callers start it with `server.listen(port)`.
 */
export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new OffboardingService({ store });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
