/**
 * End-to-end: the real Booking service runs in-process, and the schedule BFF
 * proxies to it. This exercises the whole path — page serving + the generic
 * `/api/*` proxy + Booking's own logic — over real HTTP.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';
import { createApp as createBooking } from '../../../booking/src/api/server.ts';

async function listen(server: { listen: Function; address: Function }) {
  await new Promise<void>((r) => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

async function withStack(run: (base: string) => Promise<void>) {
  const booking = createBooking();
  const bookingPort = await listen(booking.server);
  const app = createApp({ bookingBase: `http://127.0.0.1:${bookingPort}` });
  const port = await listen(app.server);
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((r) => app.server.close(() => r()));
    await new Promise<void>((r) => booking.server.close(() => r()));
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

test('serves the schedule app at /', async () => {
  await withStack(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await res.text(), /Live Schedule/);
  });
});

test('proxies booking calls: set up, book, and read the schedule', async () => {
  await withStack(async (base) => {
    const co = (await j(base, 'POST', '/api/companies', { name: 'Serenity' })).json.id as string;
    const svc = (await j(base, 'POST', '/api/services', { companyId: co, name: '60-min', durationMinutes: 60 })).json.id as string;
    const wk = (await j(base, 'POST', '/api/workers', { companyId: co, name: 'Robin' })).json.id as string;

    const appt = await j(base, 'POST', '/api/appointments', { companyId: co, serviceId: svc, clientName: 'Pat', start: '2026-08-01T15:00:00.000Z' });
    assert.equal(appt.status, 201);
    const confirmed = await j(base, 'POST', `/api/appointments/${appt.json.id}/confirm`, { workerId: wk });
    assert.equal(confirmed.json.status, 'confirmed');

    const schedule = await j(base, 'GET', `/api/appointments?companyId=${co}&from=2026-08-01T00:00:00.000Z&to=2026-08-02T00:00:00.000Z`);
    assert.equal(schedule.json.length, 1);
    assert.equal(schedule.json[0].clientName, 'Pat');
  });
});

test('upstream error status passes through the proxy', async () => {
  await withStack(async (base) => {
    const bad = await j(base, 'POST', '/api/services', { companyId: 'co_does_not_exist', name: 'x', durationMinutes: 30 });
    assert.equal(bad.status, 404); // company not found, surfaced by Booking through the proxy
    assert.equal(bad.json.error.code, 'not_found');
  });
});
