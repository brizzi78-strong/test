/**
 * Entry point: start the Invest UI (BFF over the Trading service).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT                 HTTP port (default 5000)
 *   TRADING_URL          Trading base URL (default http://trading:4900)
 *   ACCOUNT_NAME         Demo account name (default "Rob")
 *   ACCOUNT_ID           Reuse an existing Trading account id (recommended in prod)
 *   STARTING_CASH_CENTS  Starting buying power for a newly created account
 *   INVEST_USER / INVEST_PASSWORD   optional HTTP Basic auth gate
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 5000);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Invest listening on http://localhost:${port}`);
});
