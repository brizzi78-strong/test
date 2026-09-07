import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

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

test('API drives a packet from assign to complete', async () => {
  const { base, close } = await startServer();
  try {
    assert.equal((await get(base, '/health')).status, 200);

    const company = await post(base, '/companies', { name: 'Globex' });
    const companyId = company.json.id as string;

    const employee = await post(base, '/employees', {
      companyId,
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin.park@example.com',
      position: 'Analyst',
      startDate: '2026-09-01',
    });
    const employeeId = employee.json.id as string;

    const template = await post(base, '/templates', {
      companyId,
      name: 'Standard',
      items: ['i9', 'direct_deposit'],
    });
    const templateId = template.json.id as string;

    const packet = await post(base, '/packets', { companyId, employeeId, templateId });
    assert.equal(packet.status, 201);
    const packetId = packet.json.id as string;
    assert.equal(packet.json.status, 'not_started');

    // i9 needs a signature — without one it's a 400.
    const noSig = await post(base, `/packets/${packetId}/items/i9/submit`, { data: {} });
    assert.equal(noSig.status, 400);

    const signed = await post(base, `/packets/${packetId}/items/i9/submit`, {
      signature: { name: 'Robin Park' },
      data: { workAuth: 'citizen' },
    });
    assert.equal(signed.status, 200);
    assert.equal(signed.json.status, 'in_progress');

    await post(base, `/packets/${packetId}/items/direct_deposit/submit`, { data: { routing: '000' } });
    await post(base, `/packets/${packetId}/items/i9/approve`, { reviewedBy: 'hr@globex' });
    const finished = await post(base, `/packets/${packetId}/items/direct_deposit/approve`, {
      reviewedBy: 'hr@globex',
    });
    assert.equal(finished.json.status, 'complete');

    const listed = await get(base, `/packets?employeeId=${employeeId}`);
    assert.equal((listed.json as unknown[]).length, 1);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/packets/pkt_nope');
    assert.equal(missing.status, 404);
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const badType = await post(base, '/packets/pkt_x/items/telepathy/submit', {});
    assert.equal(badType.status, 400);
  } finally {
    await close();
  }
});
