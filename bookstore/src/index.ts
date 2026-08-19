/**
 * Entry point: start the Bookstore HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 5000).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 5000);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Bookstore listening on http://localhost:${port}`);
});
