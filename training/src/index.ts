/**
 * Entry point: start the Training portal HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3300).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3300);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Training listening on http://localhost:${port}`);
});
