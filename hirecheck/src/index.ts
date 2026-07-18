/**
 * Entry point: start the background-check HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3000).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3000);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`HireCheck listening on http://localhost:${port}`);
});
