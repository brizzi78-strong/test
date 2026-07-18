/**
 * HTTP server wiring: assemble a ScreeningService with an in-memory store and
 * the mock provider, then expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { EquifaxProvider } from '../providers/equifaxProvider.ts';
import { MockProvider } from '../providers/mockProvider.ts';
import type { ScreeningProvider } from '../providers/provider.ts';
import { ScreeningService } from '../service/screeningService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: ScreeningService;
}

/**
 * Select a screening provider from the environment.
 *
 * `HIRECHECK_PROVIDER=equifax` uses the Equifax adapter (requires
 * `EQUIFAX_BASE_URL` and `EQUIFAX_API_KEY`); anything else falls back to the
 * deterministic MockProvider, which is the safe default for tests and demos.
 */
export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): ScreeningProvider {
  if ((env.HIRECHECK_PROVIDER ?? '').toLowerCase() === 'equifax') {
    const baseUrl = env.EQUIFAX_BASE_URL;
    const apiKey = env.EQUIFAX_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error(
        'HIRECHECK_PROVIDER=equifax requires EQUIFAX_BASE_URL and EQUIFAX_API_KEY',
      );
    }
    return new EquifaxProvider({ baseUrl, apiKey });
  }
  return new MockProvider();
}

/**
 * Create (but do not start) an HTTP server backed by a fresh in-memory store.
 * The provider defaults to the environment selection; pass one explicitly (e.g.
 * in tests) to override. Callers start it with `server.listen(port)`.
 */
export function createApp(provider: ScreeningProvider = providerFromEnv()): AppServer {
  const service = new ScreeningService({
    store: createInMemoryStore(),
    provider,
  });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
