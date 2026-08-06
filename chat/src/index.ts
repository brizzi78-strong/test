/**
 * Entry point: start the Cardinal Chat HTTP service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Configure the port with the PORT environment variable (default 4700).
 * Set ANTHROPIC_API_KEY to enable chat; without it the UI loads but
 * requests return a clear "no key configured" error.
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4700);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Chat listening on http://localhost:${port}`);
});
