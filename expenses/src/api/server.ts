/**
 * HTTP server wiring: assemble an ExpenseService with a store and expose it
 * over HTTP alongside the single-page web app.
 */

import { createServer, type Server } from 'node:http';
import { ExpenseService } from '../service/expenseService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener, type ListenerOptions } from './router.ts';

export interface AppServer {
  server: Server;
  service: ExpenseService;
}

export interface AppOptions {
  /** Basic-auth gate; both must be set to enable it (EXPENSES_USER/EXPENSES_PASSWORD). */
  user?: string;
  password?: string;
  /** Site display name (BRAND_NAME), e.g. "Cardinal Expenses". */
  brandName?: string;
}

/**
 * Select a store from the environment: `EXPENSES_DB=/path/to/data.db` uses the
 * durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.EXPENSES_DB ? createSqliteStore(env.EXPENSES_DB) : createInMemoryStore();
}

const WEB_INDEX = new URL('../web/index.html', import.meta.url);

/**
 * Create (but do not start) an HTTP server. The store and options default to
 * the environment selection; pass them explicitly (e.g. in tests) to override.
 */
export function createApp(store: Store = storeFromEnv(), opts: AppOptions = {}): AppServer {
  const user = opts.user ?? process.env.EXPENSES_USER;
  const password = opts.password ?? process.env.EXPENSES_PASSWORD;
  const listenerOpts: ListenerOptions = {
    gate: user && password ? { user, password } : undefined,
    brandName: opts.brandName ?? process.env.BRAND_NAME,
  };
  const service = new ExpenseService({ store });
  const server = createServer(createRequestListener(service, WEB_INDEX, listenerOpts));
  return { server, service };
}
