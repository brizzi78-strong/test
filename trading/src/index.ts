/**
 * Entry point: start the Trading (brokerage engine) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT         HTTP port (default 4900)
 *   TRADING_DB   SQLite path for durable storage (unset → in-memory)
 *   MARKET_DATA  'yahoo' for live Yahoo Finance quotes (unset → mock feed)
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4900);
const { server, service } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Trading listening on http://localhost:${port} (market data: ${service.marketDataName})`);
});
