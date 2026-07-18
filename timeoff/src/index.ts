/**
 * Entry point: start the Time Off (PTO) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with PORT (default 3700) and durable storage with
 * TIMEOFF_DB=/path/to/data.db.
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3700);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Time Off listening on http://localhost:${port}`);
});
