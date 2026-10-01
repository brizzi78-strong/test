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

test('full procure-to-pay and order-to-cash cycle over HTTP', async () => {
  await withServer(async (base) => {
    assert.equal((await j(base, 'GET', '/health')).status, 200);

    const mat = await j(base, 'POST', '/materials', { companyId: 'co1', sku: 'INK-BLK', description: 'Black ink', unit: 'BOX' });
    assert.equal(mat.status, 201);
    const ven = await j(base, 'POST', '/vendors', { companyId: 'co1', name: 'Acme Supply' });
    const cus = await j(base, 'POST', '/customers', { companyId: 'co1', name: 'Blue Ridge Press' });

    // Buy 10 boxes at $2.00.
    const po = await j(base, 'POST', '/purchase-orders', {
      companyId: 'co1',
      vendorId: ven.json.id,
      lines: [{ materialId: mat.json.id, quantity: 10, unitPriceCents: 200 }],
    });
    assert.equal(po.status, 201);
    assert.equal(po.json.totalCents, 2000);

    const gr = await j(base, 'POST', `/purchase-orders/${po.json.id}/goods-receipts`, { lines: [{ lineNo: 1, quantity: 10 }] });
    assert.equal(gr.status, 201);

    const vi = await j(base, 'POST', `/purchase-orders/${po.json.id}/invoices`, {
      lines: [{ lineNo: 1, quantity: 10, unitPriceCents: 200 }],
    });
    assert.equal(vi.json.status, 'posted');

    // Sell 4 boxes at $5.00.
    const so = await j(base, 'POST', '/sales-orders', {
      companyId: 'co1',
      customerId: cus.json.id,
      lines: [{ materialId: mat.json.id, quantity: 4, unitPriceCents: 500 }],
    });
    assert.equal(so.status, 201);

    const atp = (await j(base, 'GET', `/materials/${mat.json.id}/availability`)).json;
    assert.equal(atp.onHand, 10);
    assert.equal(atp.availableToPromise, 6);

    const dl = await j(base, 'POST', `/sales-orders/${so.json.id}/deliveries`, { lines: [{ lineNo: 1, quantity: 4 }] });
    assert.equal(dl.status, 201);
    assert.equal(dl.json.cogsCents, 800); // 4 × $2.00 moving average

    const ci = await j(base, 'POST', `/sales-orders/${so.json.id}/invoices`, {});
    assert.equal(ci.json.totalCents, 2000); // 4 × $5.00

    const stock = (await j(base, 'GET', '/stock?companyId=co1')).json;
    assert.equal(stock.length, 1);
    assert.equal(stock[0].onHand, 6);
    assert.equal(stock[0].valueCents, 1200);

    const flow = (await j(base, 'GET', `/document-flow/${so.json.id}`)).json;
    assert.deepEqual(flow.documents.map((d: any) => d.type), ['sales_order', 'delivery', 'customer_invoice']);
  });
});

test('domain failures surface with the right HTTP status', async () => {
  await withServer(async (base) => {
    // Validation → 400.
    assert.equal((await j(base, 'POST', '/materials', { companyId: 'co1' })).status, 400);
    // Unknown ids → 404.
    assert.equal((await j(base, 'GET', '/purchase-orders/po_nope')).status, 404);
    assert.equal((await j(base, 'GET', '/document-flow/so_nope')).status, 404);

    const mat = await j(base, 'POST', '/materials', { companyId: 'co1', sku: 'INK-BLK', description: 'Black ink' });
    // Duplicate sku → 409.
    assert.equal((await j(base, 'POST', '/materials', { companyId: 'co1', sku: 'INK-BLK', description: 'Again' })).status, 409);

    // Delivery without stock → 409.
    const cus = await j(base, 'POST', '/customers', { companyId: 'co1', name: 'Blue Ridge Press' });
    const so = await j(base, 'POST', '/sales-orders', {
      companyId: 'co1',
      customerId: cus.json.id,
      lines: [{ materialId: mat.json.id, quantity: 1, unitPriceCents: 500 }],
    });
    assert.equal((await j(base, 'POST', `/sales-orders/${so.json.id}/deliveries`, { lines: [{ lineNo: 1, quantity: 1 }] })).status, 409);
  });
});
