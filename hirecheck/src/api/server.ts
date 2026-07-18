/**
 * HTTP server wiring: assemble a ScreeningService with an in-memory store and
 * the mock provider, then expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { MockProvider } from '../providers/mockProvider.ts';
import { ScreeningService } from '../service/screeningService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: ScreeningService;
}

/**
 * Create (but do not start) an HTTP server backed by a fresh in-memory store
 * and the mock provider. Callers start it with `server.listen(port)`.
 */
export function createApp(): AppServer {
  const service = new ScreeningService({
    store: createInMemoryStore(),
    provider: new MockProvider(),
  });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
