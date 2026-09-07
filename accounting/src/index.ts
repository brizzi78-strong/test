/**
 * Entry point: start the Accounting (bookkeeping) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4400).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4400);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Accounting listening on http://localhost:${port}`);
});
