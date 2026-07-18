/**
 * Entry point: start the Payroll HTTP service (Raleigh, NC configuration).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3500).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3500);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Payroll listening on http://localhost:${port}`);
});
