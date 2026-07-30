/**
 * Entry point: start the Time & attendance service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT           HTTP port (default 4800)
 *   TIMECLOCK_DB   SQLite file path; unset uses the in-memory store
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4800);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Timeclock listening on http://localhost:${port}`);
});
