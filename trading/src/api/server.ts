/**
 * HTTP server wiring: assemble a TradingService with a store and expose it
 * over HTTP.
 */

import { createServer, type Server } from 'node:http';
import { TradingService } from '../service/tradingService.ts';
import { marketDataFromEnv, type MarketDataSource } from '../domain/marketData.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';
import { createRequestListener } from './router.ts';

export interface AppServer {
  server: Server;
  service: TradingService;
}

/**
 * Select a store from the environment: `TRADING_DB=/path/to/data.db` uses the
 * durable SQLite store; unset falls back to the in-memory store.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  return env.TRADING_DB ? createSqliteStore(env.TRADING_DB) : createInMemoryStore();
}

/**
 * Create (but do not start) an HTTP server. The store and market-data source
 * default to the environment selection (`TRADING_DB`, `MARKET_DATA`); pass
 * either explicitly (e.g. in tests) to override. Callers start it with
 * `server.listen(port)`.
 */
export function createApp(store: Store = storeFromEnv(), marketData: MarketDataSource = marketDataFromEnv()): AppServer {
  const service = new TradingService({ store, marketData });
  const server = createServer(createRequestListener(service));
  return { server, service };
}
