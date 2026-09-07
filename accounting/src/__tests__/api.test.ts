/**
 * End-to-end HTTP test: boot the accounting service in-process and drive the
 * full billing loop over the wire — chart of accounts, a customer, an invoice
 * that gets issued and paid, an expense, and both reports.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';
import { createInMemoryStore } from '../store/store.ts';

async function withServer(run: (base: string) => Promise<void>) {
  const { server } = createApp(createInMemoryStore());
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
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

test('health and meta', async () => {
  await withServer(async (base) => {
    assert.equal((await j(base, 'GET', '/health')).json.status, 'ok');
    const meta = await j(base, 'GET', '/meta');
    assert.equal(meta.json.service, 'accounting');
    assert.ok(meta.json.accountTypes.includes('income'));
  });
});

test('full billing loop over HTTP', async () => {
  await withServer(async (base) => {
    const co = (await j(base, 'POST', '/companies', { name: 'Blue Ridge Press LLC' })).json;
    const revenue = (await j(base, 'POST', '/accounts', { companyId: co.id, type: 'income', name: 'Revenue' })).json;
    const software = (await j(base, 'POST', '/accounts', { companyId: co.id, type: 'expense', name: 'Software' })).json;
    const cust = (await j(base, 'POST', '/customers', { companyId: co.id, name: 'Acme' })).json;

    const draft = await j(base, 'POST', '/invoices', {
      companyId: co.id,
      customerId: cust.id,
      incomeAccountId: revenue.id,
      taxRateBps: 1000,
      lines: [{ description: 'Work', quantity: 2, unitPriceCents: 50000 }],
    });
    assert.equal(draft.status, 201);
    assert.equal(draft.json.status, 'draft');
    assert.equal(draft.json.totalCents, 110000); // 100000 + 10% tax

    const issued = await j(base, 'POST', `/invoices/${draft.json.id}/issue`, { issueDate: '2026-07-05' });
    assert.equal(issued.json.status, 'open');
    assert.equal(issued.json.number, 'INV-0001');

    const paid = await j(base, 'POST', `/invoices/${draft.json.id}/payments`, { amountCents: 110000 });
    assert.equal(paid.json.status, 'paid');
    assert.equal(paid.json.balanceCents, 0);

    await j(base, 'POST', '/expenses', { companyId: co.id, vendor: 'AWS', accountId: software.id, amountCents: 15000, date: '2026-07-08' });

    const pl = await j(base, 'GET', `/reports/profit-and-loss?companyId=${co.id}&from=2026-07-01&to=2026-07-31`);
    assert.equal(pl.json.income.totalCents, 110000);
    assert.equal(pl.json.expenses.totalCents, 15000);
    assert.equal(pl.json.netCents, 95000);

    const ar = await j(base, 'GET', `/reports/accounts-receivable?companyId=${co.id}`);
    assert.equal(ar.json.totalCents, 0); // the only invoice is paid
  });
});

test('reports require a companyId, and unknown routes are 404', async () => {
  await withServer(async (base) => {
    assert.equal((await j(base, 'GET', '/reports/profit-and-loss')).status, 400);
    assert.equal((await j(base, 'GET', '/nope')).status, 404);
  });
});

test('per-tenant isolation: a tenant only sees its own accounts', async () => {
  await withServer(async (base) => {
    const a = (await j(base, 'POST', '/companies', { name: 'Tenant A' })).json;
    const b = (await j(base, 'POST', '/companies', { name: 'Tenant B' })).json;
    await j(base, 'POST', '/accounts', { companyId: a.id, type: 'income', name: 'A-Rev' });
    await j(base, 'POST', '/accounts', { companyId: b.id, type: 'income', name: 'B-Rev' });

    // Behind the gateway header, list is scoped to the tenant regardless of query.
    const res = await fetch(`${base}/accounts`, { headers: { 'x-gateway-tenant': a.id } });
    const rows = (await res.json()) as any[];
    assert.ok(rows.length >= 1);
    assert.ok(rows.every((r) => r.companyId === a.id));
  });
});
