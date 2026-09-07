/**
 * Entry point: start the Cardinal HR admin portal (UI + backend-for-frontend).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT             HTTP port (default 4000)
 *   ORCHESTRATOR_URL orchestrator base URL (default http://orchestrator:3900)
 *   GATEWAY_API_KEY  optional Bearer key sent upstream, kept off the browser
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4000);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal HR portal listening on http://localhost:${port}`);
});
