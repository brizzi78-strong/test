/**
 * Entry point: start the FairFare HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4700).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4700);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`FairFare listening on http://localhost:${port}`);
});
