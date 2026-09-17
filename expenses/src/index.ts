/**
 * Entry point: start the Expenses HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with PORT (default 3900) and durable storage with
 * EXPENSES_DB=/path/to/data.db.
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3900);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Expenses listening on http://localhost:${port}`);
});
