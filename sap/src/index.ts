/**
 * Entry point: start the Cardinal ERP (SAP-style) service.
 *
 * Run with:  node src/index.ts   (or `npm start`)
 * Config:
 *   PORT     HTTP port (default 5000)
 *   SAP_DB   SQLite file path; unset uses the in-memory store
 */

import { createApp } from './api/server.ts';

const port = Number(process.env.PORT ?? 5000);
const { server } = createApp();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cardinal ERP (SAP-style) listening on http://localhost:${port}`);
});
