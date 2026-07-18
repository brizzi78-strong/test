/**
 * Entry point: start the Recruiting (applicant-tracking) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 3200).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 3200);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Recruiting listening on http://localhost:${port}`);
});
