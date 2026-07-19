/**
 * Entry point: start the client-facing booking site.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT                HTTP port (default 4300)
 *   BOOKING_URL         Booking base URL (default http://booking:4100)
 *   BUSINESS_COMPANY_ID the company clients book into (required to accept bookings)
 *   BUSINESS_NAME       shown on the page (default "Our Studio")
 *   GATEWAY_API_KEY     optional bearer key sent upstream, kept off the browser
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4300);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Booking site listening on http://localhost:${port}`);
});
