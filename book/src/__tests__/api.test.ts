/**
 * End-to-end: a real Booking service runs in-process, seeded with one business
 * and a service; the public booking site is configured for that company. The
 * tests confirm the narrow public surface — list services, create a *requested*
 * appointment — and that nothing else is exposed.
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

async function j(base: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

async function withSite(run: (base: string, ctx: { companyId: string; serviceId: string; bookingBase: string }) => Promise<void>) {
  const booking = createBooking();
  const bookingPort = await listen(booking.server);
  const bookingBase = `http://127.0.0.1:${bookingPort}`;
  // Seed a business + service directly on Booking.
  const co = (await j(bookingBase, 'POST', '/companies', { name: 'Serenity' })).json.id as string;
  const svc = (await j(bookingBase, 'POST', '/services', { companyId: co, name: '60-min massage', durationMinutes: 60, priceCents: 9000 })).json.id as string;

  const site = createApp({ bookingBase, companyId: co, businessName: 'Serenity Massage' });
  const sitePort = await listen(site.server);
  try {
    await run(`http://127.0.0.1:${sitePort}`, { companyId: co, serviceId: svc, bookingBase });
  } finally {
    await new Promise<void>((r) => site.server.close(() => r()));
    await new Promise<void>((r) => booking.server.close(() => r()));
  }
}

test('the page renders with the business name', async () => {
  await withSite(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Book with Serenity Massage/);
  });
});

test('lists the public service menu (only safe fields)', async () => {
  await withSite(async (base, ctx) => {
    const menu = await j(base, 'GET', '/api/services');
    assert.equal(menu.status, 200);
    assert.equal(menu.json.length, 1);
    assert.deepEqual(Object.keys(menu.json[0]).sort(), ['durationMinutes', 'id', 'name', 'priceCents']);
    assert.equal(menu.json[0].id, ctx.serviceId);
  });
});

test('a client can request an appointment; it lands as requested on Booking', async () => {
  await withSite(async (base, ctx) => {
    const res = await j(base, 'POST', '/api/book', {
      serviceId: ctx.serviceId,
      clientName: 'Pat Rivera',
      clientPhone: '555-0100',
      start: '2026-08-01T15:00:00.000Z',
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.status, 'requested');
    assert.equal(res.json.serviceName, '60-min massage');
    // The booking exists on the backend as a pending request the business will confirm.
    const all = await j(ctx.bookingBase, 'GET', `/appointments?companyId=${ctx.companyId}`);
    assert.equal(all.json.length, 1);
    assert.equal(all.json[0].status, 'requested');
    assert.equal(all.json[0].clientName, 'Pat Rivera');
  });
});

test('booking requires a service, name, and time', async () => {
  await withSite(async (base, ctx) => {
    const bad = await j(base, 'POST', '/api/book', { serviceId: ctx.serviceId, clientName: '', start: '' });
    assert.equal(bad.status, 400);
  });
});

test('the admin surface is NOT exposed publicly', async () => {
  await withSite(async (base) => {
    // No schedule read, no workers, no confirm/cancel — these are just 404s here.
    assert.equal((await j(base, 'GET', '/api/appointments')).status, 404);
    assert.equal((await j(base, 'GET', '/api/workers')).status, 404);
    assert.equal((await j(base, 'POST', '/api/appointments')).status, 404);
  });
});
