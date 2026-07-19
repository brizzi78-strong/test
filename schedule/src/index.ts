/**
 * Entry point: start the Live Schedule UI (BFF over the Booking service).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT             HTTP port (default 4200)
 *   BOOKING_URL      Booking base URL (default http://booking:4100)
 *   GATEWAY_API_KEY  optional Bearer key sent upstream, kept off the browser
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4200);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Schedule UI listening on http://localhost:${port}`);
});
