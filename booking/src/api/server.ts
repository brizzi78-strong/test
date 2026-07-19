/**
 * HTTP server wiring: assemble a BookingService with a store and expose it.
 * `BOOKING_DB=/path/to/data.db` selects the durable SQLite store; unset uses the
 * in-memory store (tests, demos).
 */

import { createServer, type Server } from 'node:http';
import { BookingService } from '../service/bookingService.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: BookingService;
}

export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  const dbPath = env.BOOKING_DB;
  return dbPath ? createSqliteStore(dbPath) : createInMemoryStore();
}

export function createApp(store: Store = storeFromEnv()): AppServer {
  const service = new BookingService({ store });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
