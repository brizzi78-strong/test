/**
 * Entry point: start the Offboarding HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with PORT (default 3800) and durable storage with
 * OFFBOARDING_DB=/path/to/data.db.
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3800);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Offboarding listening on http://localhost:${port}`);
});
