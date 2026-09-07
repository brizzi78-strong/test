/**
 * All-in-one launcher for Cardinal Books — runs the Accounting service and the
 * Books app in a single container/process. This is what one-click hosts
 * (Render, Railway, Fly) run: one web service, one persistent disk.
 *
 * - Accounting listens on 127.0.0.1:4400 with a durable SQLite store
 *   (ACCOUNTING_DB, e.g. /data/accounting.db on a mounted disk).
 * - Books listens on the platform-provided PORT and proxies to it.
 *
 * Config: PORT (from the host), ACCOUNTING_DB, BUSINESS_NAME, and the optional
 * BOOKS_USER / BOOKS_PASSWORD gate — all read from the environment.
 */

import { createApp as createAccounting } from '../accounting/src/api/server.ts';
import { createApp as createBooks } from '../books/src/api/server.ts';

const ACC_PORT = 4400;

// Accounting: durable store comes from ACCOUNTING_DB (storeFromEnv). Bind to
// loopback so only the co-located Books app can reach it.
const accounting = createAccounting();
accounting.server.listen(ACC_PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`Accounting (internal) on http://127.0.0.1:${ACC_PORT}`);
});

const port = Number(process.env.PORT ?? 4500);
const books = createBooks({ accountingBase: `http://127.0.0.1:${ACC_PORT}` });
books.server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal Books on http://localhost:${port}`);
});
