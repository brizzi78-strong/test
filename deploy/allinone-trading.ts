/**
 * All-in-one launcher for Cardinal Trading — runs the Trading engine and the
 * Cardinal Trading app in a single container/process. This is what one-click
 * hosts (Render, Railway, Fly) run: one web service, one persistent disk.
 *
 * - Trading listens on 127.0.0.1:4900 with a durable SQLite store
 *   (TRADING_DB, e.g. /data/trading.db on a mounted disk).
 * - Cardinal Trading listens on the platform-provided PORT and proxies to it.
 *
 * Config: PORT (from the host), TRADING_DB, INVEST_DB, MARKET_DATA,
 * STARTING_CASH_CENTS, INVEST_TRUST_PROXY / INVEST_COOKIE_SECURE,
 * INVEST_BASE_URL + SendGrid vars for real email, and the CARD launch trio
 * (ETH_RPC_URL, CARD_POOL_ADDRESS, CARD_TOKEN_ADDRESS) — all from the
 * environment.
 */

import { createApp as createTrading } from '../trading/src/api/server.ts';
import { createApp as createInvest } from '../invest/src/api/server.ts';

const TRADING_PORT = 4900;

// Trading: durable store comes from TRADING_DB (storeFromEnv). Bind to
// loopback so only the co-located Cardinal Trading app can reach it.
const trading = createTrading();
trading.server.listen(TRADING_PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`Trading (internal) on http://127.0.0.1:${TRADING_PORT} (market data: ${trading.service.marketDataName})`);
});

const port = Number(process.env.PORT ?? 5000);
const invest = createInvest({ tradingBase: `http://127.0.0.1:${TRADING_PORT}` });
invest.server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Trading on http://localhost:${port}`);
});
