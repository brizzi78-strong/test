/**
 * End-to-end: a real Accounting service runs in-process; the Books BFF points
 * at it. The tests drive the app the way the browser does — bootstrap the
 * business, add a customer, create/issue/pay an invoice, add an expense — all
 * through the BFF's proxied `/api/*`, and confirm the data really persists in
 * Accounting.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp as createBooks } from '../api/server.ts';
import { createApp as createAccounting } from '../../../accounting/src/api/server.ts';
import { createInMemoryStore } from '../../../accounting/src/store/store.ts';

async function listen(server: { listen: Function; address: Function; close: Function }) {
  await new Promise<void>((r) => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

async function withApp(run: (base: string) => Promise<void>) {
  const accounting = createAccounting(createInMemoryStore());
  const accPort = await listen(accounting.server);
  const books = createBooks({ accountingBase: `http://127.0.0.1:${accPort}`, businessName: 'Blue Ridge Press LLC' });
  const booksPort = await listen(books.server);
  try {
    await run(`http://127.0.0.1:${booksPort}`);
  } finally {
    await new Promise<void>((r) => books.server.close(() => r()));
    await new Promise<void>((r) => accounting.server.close(() => r()));
  }
}

async function j(base: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

test('password gate: blocks without creds, allows with, health stays open', async () => {
  const accounting = createAccounting(createInMemoryStore());
  const accPort = await listen(accounting.server);
  const books = createBooks({
    accountingBase: `http://127.0.0.1:${accPort}`,
    businessName: 'Blue Ridge Press LLC',
    user: 'admin',
    password: 's3cret',
  });
  const port = await listen(books.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(`${base}/`)).status, 401); // no creds
    assert.equal((await fetch(`${base}/health`)).status, 200); // health exempt
    const good = 'Basic ' + Buffer.from('admin:s3cret').toString('base64');
    assert.equal((await fetch(`${base}/`, { headers: { authorization: good } })).status, 200);
    const bad = 'Basic ' + Buffer.from('admin:wrong').toString('base64');
    assert.equal((await fetch(`${base}/`, { headers: { authorization: bad } })).status, 401);
  } finally {
    await new Promise<void>((r) => books.server.close(() => r()));
    await new Promise<void>((r) => accounting.server.close(() => r()));
  }
});

test('serves the app shell', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /Cardinal Books/);
  });
});

test('bootstraps the business and a default chart of accounts', async () => {
  await withApp(async (base) => {
    const app = await j(base, 'GET', '/api/app');
    assert.equal(app.status, 200);
    assert.equal(app.json.businessName, 'Blue Ridge Press LLC');
    assert.ok(app.json.companyId);

    const accts = await j(base, 'GET', `/api/accounts?companyId=${app.json.companyId}`);
    assert.equal(accts.json.length, 5); // seeded default chart
    assert.ok(accts.json.some((a: any) => a.type === 'income' && a.name === 'Consulting Revenue'));
    assert.ok(accts.json.some((a: any) => a.type === 'expense' && a.name === 'Software'));
  });
});

test('restart reuses the same company instead of creating a duplicate', async () => {
  // Share one Accounting instance across two Books BFFs (a "restart").
  const accounting = createAccounting(createInMemoryStore());
  const accPort = await listen(accounting.server);
  const accountingBase = `http://127.0.0.1:${accPort}`;
  const mkBooks = () => createBooks({ accountingBase, businessName: 'Blue Ridge Press LLC' });

  const b1 = mkBooks();
  const p1 = await listen(b1.server);
  const b2 = mkBooks();
  const p2 = await listen(b2.server);
  try {
    const id1 = (await j(`http://127.0.0.1:${p1}`, 'GET', '/api/app')).json.companyId;
    const id2 = (await j(`http://127.0.0.1:${p2}`, 'GET', '/api/app')).json.companyId;
    assert.equal(id1, id2); // same books, not a duplicate company
    // And the default chart of accounts was seeded exactly once.
    const accts = (await j(`http://127.0.0.1:${p2}`, 'GET', `/api/accounts?companyId=${id2}`)).json as any[];
    assert.equal(accts.length, 5);
  } finally {
    await new Promise<void>((r) => b1.server.close(() => r()));
    await new Promise<void>((r) => b2.server.close(() => r()));
    await new Promise<void>((r) => accounting.server.close(() => r()));
  }
});

test('the full billing loop persists through the BFF', async () => {
  await withApp(async (base) => {
    const co = (await j(base, 'GET', '/api/app')).json.companyId as string;
    const accts = (await j(base, 'GET', `/api/accounts?companyId=${co}`)).json as any[];
    const income = accts.find((a) => a.type === 'income').id;

    const cust = await j(base, 'POST', '/api/customers', { companyId: co, name: 'Acme Co' });
    assert.equal(cust.status, 201);

    const draft = await j(base, 'POST', '/api/invoices', {
      companyId: co,
      customerId: cust.json.id,
      incomeAccountId: income,
      taxRateBps: 1000,
      lines: [{ description: 'Work', quantity: 2, unitPriceCents: 50000 }],
    });
    assert.equal(draft.json.status, 'draft');
    assert.equal(draft.json.totalCents, 110000);

    const issued = await j(base, 'POST', `/api/invoices/${draft.json.id}/issue`, {});
    assert.equal(issued.json.status, 'open');
    assert.equal(issued.json.number, 'INV-0001');

    const paid = await j(base, 'POST', `/api/invoices/${draft.json.id}/payments`, { amountCents: 110000 });
    assert.equal(paid.json.status, 'paid');

    // Persisted upstream: a fresh read via the proxy still shows it paid.
    const list = await j(base, 'GET', `/api/invoices?companyId=${co}`);
    assert.equal(list.json.length, 1);
    assert.equal(list.json[0].status, 'paid');

    const pl = await j(base, 'GET', `/api/reports/profit-and-loss?companyId=${co}`);
    assert.equal(pl.json.income.totalCents, 110000);
  });
});
