/**
 * Entry point: start the Benefits (benefits-election) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3400).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3400);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Benefits listening on http://localhost:${port}`);
});
