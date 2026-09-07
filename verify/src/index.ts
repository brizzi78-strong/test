/**
 * Entry point: start the Cardinal Verify app (console + consent + verifier).
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT             HTTP port (default 4600)
 *   VERIFY_DB        SQLite file path; unset uses the in-memory store
 *   VERIFY_USER /    optional password gate on the business console
 *   VERIFY_PASSWORD  (public consent + verifier links are never gated)
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 4600);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Verify listening on http://localhost:${port}`);
});
