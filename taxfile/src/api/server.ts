/**
 * HTTP server wiring: assemble a TaxReturnService with a store and expose it
 * over HTTP alongside the single-page web app.
 */

import { createServer, type Server } from 'node:http';
import { TaxReturnService } from '../service/taxReturnService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener, type ListenerOptions } from './router.ts';

export interface AppServer {
  server: Server;
  service: TaxReturnService;
}

export interface AppOptions {
  /** Basic-auth gate; both must be set to enable it (TAXFILE_USER/TAXFILE_PASSWORD). */
  user?: string;
  password?: string;
  /** Site display name (BRAND_NAME), e.g. "Blue Ridge Tax". */
  brandName?: string;
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
 * Create (but do not start) an HTTP server. The store and options default to
 * the environment selection; pass them explicitly (e.g. in tests) to override.
 */
export function createApp(store: Store = storeFromEnv(), opts: AppOptions = {}): AppServer {
  const user = opts.user ?? process.env.TAXFILE_USER;
  const password = opts.password ?? process.env.TAXFILE_PASSWORD;
  const listenerOpts: ListenerOptions = {
    gate: user && password ? { user, password } : undefined,
    brandName: opts.brandName ?? process.env.BRAND_NAME,
  };
  const service = new TaxReturnService({ store });
  const server = createServer(createRequestListener(service, WEB_INDEX, listenerOpts));
  return { server, service };
}
