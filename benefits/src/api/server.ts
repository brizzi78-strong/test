/**
 * HTTP server wiring: assemble a BenefitsService with an in-memory store and
 * expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { BenefitsService } from '../service/benefitsService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: BenefitsService;
}

/**
 * Create (but do not start) an HTTP server backed by a fresh in-memory store.
 * Callers start it with `server.listen(port)`.
 */
export function createApp(): AppServer {
  const service = new BenefitsService({ store: createInMemoryStore() });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
