/**
 * Entry point: start the TaxFile HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4600).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4600);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`TaxFile listening on http://localhost:${port}`);
});
