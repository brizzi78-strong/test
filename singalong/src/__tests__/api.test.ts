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

async function req(base: string, method: string, path: string, opts: { body?: unknown; auth?: [string, string] } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth) headers.authorization = 'Basic ' + Buffer.from(opts.auth.join(':')).toString('base64');
  const res = await fetch(`${base}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  return { status: res.status, json: (await res.json()) as any };
}

test('the console page and health check are served', async () => {
  const { base, close } = await start();
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Sing Along/);
    assert.equal((await req(base, 'GET', '/health')).json.status, 'ok');
  } finally {
    await close();
  }
});

test('a full flow over HTTP: facility, resident, song, session, insights', async () => {
  const { base, close } = await start();
  try {
    const fac = (await req(base, 'POST', '/api/facilities', { body: { name: 'Cardinal Memory Care' } })).json.id as string;
    const resident = (
      await req(base, 'POST', '/api/residents', { body: { facilityId: fac, name: 'Eleanor', preferredEras: ['1950s'] } })
    ).json.id as string;
    const song = (
      await req(base, 'POST', '/api/songs', { body: { facilityId: fac, title: 'Amazing Grace', era: '1950s', source: 'public_domain' } })
    ).json.id as string;

    const suggestions = await req(base, 'GET', `/api/residents/${resident}/suggestions`);
    assert.equal(suggestions.json[0].id, song);

    const session = await req(base, 'POST', '/api/sessions', { body: { facilityId: fac, residentId: resident, moodBefore: 'withdrawn' } });
    assert.equal(session.status, 201);
    await req(base, 'POST', `/api/sessions/${session.json.id}/log`, { body: { songId: song, engagement: 'sang_along' } });
    const completed = await req(base, 'POST', `/api/sessions/${session.json.id}/complete`, { body: { moodAfter: 'calm' } });
    assert.equal(completed.json.status, 'completed');

    const insights = await req(base, 'GET', `/api/residents/${resident}/insights`);
    assert.equal(insights.json[0].songTitle, 'Amazing Grace');
    assert.equal(insights.json[0].averageEngagement, 3);
  } finally {
    await close();
  }
});

test('when a password gate is configured, the console requires it but /health stays open', async () => {
  const { server } = createApp({ user: 'admin', password: 'secret' });
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(`${base}/`)).status, 401);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const ok = await req(base, 'GET', '/api/meta', { auth: ['admin', 'secret'] });
    assert.equal(ok.status, 200);
    const bad = await req(base, 'GET', '/api/meta', { auth: ['admin', 'wrong'] });
    assert.equal(bad.status, 401);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
