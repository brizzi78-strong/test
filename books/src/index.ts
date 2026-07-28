/**
 * Entry point: start the Cardinal Books UI (BFF over the Accounting service).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT                 HTTP port (default 4500)
 *   ACCOUNTING_URL       Accounting base URL (default http://accounting:4400)
 *   BUSINESS_NAME        Company these books belong to (default "Blue Ridge Press LLC")
 *   BUSINESS_COMPANY_ID  Reuse an existing Accounting company id (recommended in prod)
 *   GATEWAY_API_KEY      optional Bearer key sent upstream, kept off the browser
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4500);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Books listening on http://localhost:${port}`);
});
