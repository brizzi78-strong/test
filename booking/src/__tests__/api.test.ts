import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

async function start() {
  const { server } = createApp();
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function req(base: string, method: string, path: string, opts: { body?: unknown; tenant?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.tenant) headers['x-gateway-tenant'] = opts.tenant;
  const res = await fetch(`${base}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  return { status: res.status, json: (await res.json()) as any };
}

test('book, confirm, and read the schedule over HTTP', async () => {
  const { base, close } = await start();
  try {
    const co = (await req(base, 'POST', '/companies', { body: { name: 'Serenity' } })).json.id as string;
    const svc = (await req(base, 'POST', '/services', { body: { companyId: co, name: '60-min', durationMinutes: 60 } })).json.id as string;
    const wk = await req(base, 'POST', '/workers', { body: { companyId: co, name: 'Robin', licenseNumber: 'DL999888' } });
    assert.equal(wk.json.licenseNumber, '••••9888'); // masked

    const a = await req(base, 'POST', '/appointments', { body: { companyId: co, serviceId: svc, clientName: 'Pat', start: '2026-08-01T15:00:00.000Z' } });
    assert.equal(a.status, 201);
    const confirmed = await req(base, 'POST', `/appointments/${a.json.id}/confirm`, { body: { workerId: wk.json.id } });
    assert.equal(confirmed.json.status, 'confirmed');

    // Overlapping booking for the same worker is refused with 409.
    const b = await req(base, 'POST', '/appointments', { body: { companyId: co, serviceId: svc, clientName: 'Lee', start: '2026-08-01T15:30:00.000Z' } });
    const clash = await req(base, 'POST', `/appointments/${b.json.id}/confirm`, { body: { workerId: wk.json.id } });
    assert.equal(clash.status, 409);

    const schedule = await req(base, 'GET', `/appointments?companyId=${co}&from=2026-08-01T00:00:00.000Z&to=2026-08-02T00:00:00.000Z`);
    assert.equal(schedule.json.length, 2); // both appointments that day
  } finally {
    await close();
  }
});

test('references can be added and recorded over HTTP', async () => {
  const { base, close } = await start();
  try {
    const co = (await req(base, 'POST', '/companies', { body: { name: 'Serenity' } })).json.id as string;
    const wk = (await req(base, 'POST', '/workers', { body: { companyId: co, name: 'Robin' } })).json.id as string;
    const ref = await req(base, 'POST', `/workers/${wk}/references`, { body: { companyId: co, refereeName: 'Dr. Kim', relationship: 'Manager' } });
    assert.equal(ref.status, 201);
    assert.equal(ref.json.status, 'requested');
    const rec = await req(base, 'POST', `/references/${ref.json.id}/record`, { body: { status: 'received', rating: 5 } });
    assert.equal(rec.json.rating, 5);
    assert.equal((await req(base, 'GET', `/workers/${wk}/references`)).json.length, 1);
  } finally {
    await close();
  }
});

test('appointments are isolated per tenant', async () => {
  const { base, close } = await start();
  try {
    const A = (await req(base, 'POST', '/companies', { body: { name: 'A' } })).json.id as string;
    const B = (await req(base, 'POST', '/companies', { body: { name: 'B' } })).json.id as string;
    const svcB = (await req(base, 'POST', '/services', { body: { companyId: B, name: 's', durationMinutes: 30 } })).json.id as string;
    const apptB = await req(base, 'POST', '/appointments', { body: { companyId: B, serviceId: svcB, clientName: 'x', start: '2026-08-01T10:00:00.000Z' }, tenant: B });
    // Tenant A cannot read tenant B's appointment by id.
    assert.equal((await req(base, 'GET', `/appointments/${apptB.json.id}`, { tenant: A })).status, 404);
  } finally {
    await close();
  }
});
