/**
 * HTTP server wiring: assemble an AidService with a store and expose it over
 * HTTP alongside the single-page web app.
 */

import { createServer, type Server } from 'node:http';
import { AidService } from '../service/aidService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { notifierFromEnv, type Notifier } from '../notify/notifier.ts';
import { createRequestListener, type ListenerOptions } from './router.ts';

export interface AppServer {
  server: Server;
  service: AidService;
}

export interface AppOptions {
  /** Basic-auth gate; both must be set to enable it (AIDFINDER_USER/AIDFINDER_PASSWORD). */
  user?: string;
  password?: string;
  /** Site display name (BRAND_NAME). */
  brandName?: string;
  /** Family-digest email transport; defaults to the environment selection. */
  notifier?: Notifier;
}

const WEB_INDEX = new URL('../web/index.html', import.meta.url);

/**
 * Select a store from the environment: `AIDFINDER_DB=/path/to/data.db` uses
 * the durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.AIDFINDER_DB ? createSqliteStore(env.AIDFINDER_DB) : createInMemoryStore();
}

/**
 * Create (but do not start) an HTTP server. The store and options default to
 * the environment selection; pass them explicitly (e.g. in tests) to override.
 */
export function createApp(store: Store = storeFromEnv(), opts: AppOptions = {}): AppServer {
  const user = opts.user ?? process.env.AIDFINDER_USER;
  const password = opts.password ?? process.env.AIDFINDER_PASSWORD;
  const listenerOpts: ListenerOptions = {
    gate: user && password ? { user, password } : undefined,
    brandName: opts.brandName ?? process.env.BRAND_NAME,
  };
  const service = new AidService({ store, notifier: opts.notifier ?? notifierFromEnv() });
  const server = createServer(createRequestListener(service, WEB_INDEX, listenerOpts));
  return { server, service };
}
