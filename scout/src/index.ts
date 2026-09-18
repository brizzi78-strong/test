/**
 * Entry point: start Cardinal Scout.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT                   HTTP port (default 4600)
 *   BRAND_NAME             Display name (default "Cardinal Scout")
 *   SCOUT_USER / SCOUT_PASSWORD   optional HTTP Basic auth gate (set both)
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4600);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Scout listening on http://localhost:${port}`);
});
