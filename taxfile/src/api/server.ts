/**
 * HTTP server wiring: assemble a TaxReturnService with a store and expose it
 * over HTTP alongside the single-page web app.
 */

import { createServer, type Server } from 'node:http';
import { TaxReturnService } from '../service/taxReturnService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: TaxReturnService;
}

/**
 * Select a store from the environment: `TAXFILE_DB=/path/to/data.db` uses the
 * durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.TAXFILE_DB ? createSqliteStore(env.TAXFILE_DB) : createInMemoryStore();
}

const WEB_INDEX = new URL('../web/index.html', import.meta.url);

/**
 * Create (but do not start) an HTTP server. The store defaults to the
 * environment selection; pass one explicitly (e.g. in tests) to override.
 */
export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new TaxReturnService({ store });
  const server = createServer(createRequestListener(service, WEB_INDEX));
  return { server, service };
}
