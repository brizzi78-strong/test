/**
 * Entry point: start Cardinal Payroll (BFF over the Payroll service).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT                 HTTP port (default 4700)
 *   PAYROLL_URL          Payroll base URL (default http://payroll:3500)
 *   BUSINESS_NAME        Company payroll is run for (default "Blue Ridge Press LLC")
 *   BUSINESS_COMPANY_ID  Reuse an existing Payroll company id (recommended in prod)
 *   PAYROLL_JURISDICTION Tax jurisdiction for a newly created company (default raleigh_nc)
 *   GATEWAY_API_KEY      optional Bearer key sent upstream, kept off the browser
 *   RUNPAY_USER / RUNPAY_PASSWORD   optional HTTP Basic gate on the console
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4700);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Payroll listening on http://localhost:${port}`);
});
