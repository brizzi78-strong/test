/**
 * HTTP server wiring: assemble an AidService with a store and expose it over
 * HTTP alongside the single-page web app.
 */

import { createServer, type Server } from 'node:http';
import { AidService } from '../service/aidService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
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
}

const WEB_INDEX = new URL('../web/index.html', import.meta.url);

/**
 * Create (but do not start) an HTTP server. The store and options default to
 * the environment selection; pass them explicitly (e.g. in tests) to override.
 */
export function createApp(store: Store = createInMemoryStore(), opts: AppOptions = {}): AppServer {
  const user = opts.user ?? process.env.AIDFINDER_USER;
  const password = opts.password ?? process.env.AIDFINDER_PASSWORD;
  const listenerOpts: ListenerOptions = {
    gate: user && password ? { user, password } : undefined,
    brandName: opts.brandName ?? process.env.BRAND_NAME,
  };
  const service = new AidService({ store });
  const server = createServer(createRequestListener(service, WEB_INDEX, listenerOpts));
  return { server, service };
}
