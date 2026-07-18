/**
 * Entry point: start the API gateway.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 *
 * Environment:
 *   PORT                  listen port (default 8080)
 *   GATEWAY_DB            path to a SQLite key store (default: in-memory)
 *   GATEWAY_ADMIN_TOKEN   enables /admin/keys when set
 *   GATEWAY_RATE_LIMIT    requests/sec per key (default 20)
 *   <SERVICE>_URL         override an upstream (e.g. DIRECTORY_URL)
 */

import { createInMemoryKeyStore, createSqliteKeyStore, type KeyStore } from './auth.ts';
import { createGateway } from './gateway.ts';
import { createTokenBucket } from './rateLimit.ts';
import { routesFromEnv } from './routes.ts';

const port = Number(process.env.PORT ?? 8080);
const keyStore: KeyStore = process.env.GATEWAY_DB
  ? createSqliteKeyStore(process.env.GATEWAY_DB)
  : createInMemoryKeyStore();
const rate = Number(process.env.GATEWAY_RATE_LIMIT ?? 20);

const gateway = createGateway({
  keyStore,
  routes: routesFromEnv(),
  rateLimiter: createTokenBucket(rate),
  adminToken: process.env.GATEWAY_ADMIN_TOKEN,
});

gateway.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`gateway listening on http://localhost:${port}`);
  if (!process.env.GATEWAY_ADMIN_TOKEN) {
    // eslint-disable-next-line no-console
    console.log('  (admin key API disabled — set GATEWAY_ADMIN_TOKEN to enable /admin/keys)');
  }
});
