/**
 * Entry point: start the Drug Discovery HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4970).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4970);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Drug Discovery listening on http://localhost:${port}`);
});
