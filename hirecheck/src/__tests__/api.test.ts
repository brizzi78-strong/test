import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

/** Start the app on an ephemeral port and return a base URL + closer. */
async function startServer() {
  const { server } = createApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { base, close };
}

async function post(base: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

async function get(base: string, path: string) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, json: await res.json() };
}

test('API drives an order through the clear workflow', async () => {
  const { base, close } = await startServer();
  try {
    const health = await get(base, '/health');
    assert.equal(health.status, 200);

    const meta = await get(base, '/meta');
    assert.ok(Array.isArray((meta.json as { checkTypes: unknown }).checkTypes));

    const company = await post(base, '/companies', { name: 'Globex' });
    assert.equal(company.status, 201);
    const companyId = company.json.id as string;

    const candidate = await post(base, '/candidates', {
      companyId,
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin.park@example.com',
      position: 'Analyst',
    });
    const candidateId = candidate.json.id as string;

    const pkg = await post(base, '/packages', {
      companyId,
      name: 'Standard',
      checkTypes: ['ssn_trace', 'national_criminal'],
    });
    const packageId = pkg.json.id as string;

    const order = await post(base, '/orders', { companyId, candidateId, packageId });
    assert.equal(order.status, 201);
    const orderId = order.json.id as string;
    assert.equal(order.json.status, 'created');

    // Submitting before authorization is a 409 conflict.
    const early = await post(base, `/orders/${orderId}/submit`);
    assert.equal(early.status, 409);

    const auth = await post(base, `/orders/${orderId}/authorization`, {
      method: 'e_signature',
      disclosureVersion: 'v1',
    });
    assert.equal(auth.status, 200);
    assert.equal(auth.json.status, 'authorized');

    const submitted = await post(base, `/orders/${orderId}/submit`);
    assert.equal(submitted.status, 200);
    assert.ok(['completed'].includes(submitted.json.status as string));

    const listed = await get(base, `/orders?companyId=${companyId}`);
    assert.equal((listed.json as unknown[]).length, 1);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/orders/ord_nope');
    assert.equal(missing.status, 404);
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not_found');

    const badRoute = await get(base, '/nonsense');
    assert.equal(badRoute.status, 404);

    const badBody = await post(base, '/companies', { name: '' });
    assert.equal(badBody.status, 400);
    assert.equal(badBody.json.error && (badBody.json.error as { code: string }).code, 'validation');
  } finally {
    await close();
  }
});
