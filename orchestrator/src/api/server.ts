/**
 * HTTP server wiring: assemble an OrchestratorService with a store and the
 * downstream provisioners, and expose it over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { provisionersFromEnv, type Provisioner } from '../downstream/provisioner.ts';
import { OrchestratorService } from '../service/orchestratorService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: OrchestratorService;
}

/**
 * Select a store from the environment: `ORCHESTRATOR_DB=/path/to/data.db` uses
 * the durable SQLite store; unset falls back to the in-memory store (tests,
 * demos).
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  const dbPath = env.ORCHESTRATOR_DB;
  return dbPath ? createSqliteStore(dbPath) : createInMemoryStore();
}

/**
 * Create (but do not start) an HTTP server. The store and provisioners default
 * to the environment selection; pass them explicitly (e.g. in tests) to
 * override. Callers start it with `server.listen(port)`.
 */
export function createApp(
  store: Store = storeFromEnv(),
  provisioners: Provisioner[] = provisionersFromEnv(),
): AppServer {
  const service = new OrchestratorService({ store, provisioners });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
