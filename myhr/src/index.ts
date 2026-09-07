/**
 * Entry point: start the MyHR new-hire paperwork HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3100).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3100);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MyHR listening on http://localhost:${port}`);
});
