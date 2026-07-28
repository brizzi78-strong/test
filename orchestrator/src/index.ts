/**
 * Entry point: start the Orchestrator (shared-identity + cascade) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3900).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3900);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator listening on http://localhost:${port}`);
});
