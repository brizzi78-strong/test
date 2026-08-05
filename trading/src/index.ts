/**
 * Entry point: start the Trading (brokerage engine) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4900).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4900);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Trading listening on http://localhost:${port}`);
});
