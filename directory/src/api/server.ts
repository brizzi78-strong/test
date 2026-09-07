/**
 * HTTP server wiring: assemble a DirectoryService with an in-memory store and
 * expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { DirectoryService } from '../service/directoryService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: DirectoryService;
}

/**
 * Select a store from the environment: `DIRECTORY_DB=/path/to/data.db` uses the
 * durable SQLite store; unset falls back to the in-memory store (tests, demos).
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  const dbPath = env.DIRECTORY_DB;
  return dbPath ? createSqliteStore(dbPath) : createInMemoryStore();
}

/**
 * Create (but do not start) an HTTP server. The store defaults to the
 * environment selection; pass one explicitly (e.g. in tests) to override.
 * Callers start it with `server.listen(port)`.
 */
export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new DirectoryService({ store });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
