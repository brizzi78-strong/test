/**
 * Entry point: start the Booking (scheduling + references) HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4100).
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4100);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Booking listening on http://localhost:${port}`);
});
