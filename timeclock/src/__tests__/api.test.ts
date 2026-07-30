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

test('record, summarize, and delete over HTTP', async () => {
  await withServer(async (base) => {
    assert.equal((await j(base, 'GET', '/health')).status, 200);

    const a = await j(base, 'POST', '/entries', { companyId: 'co1', employeeId: 'e1', date: '2026-01-05', hours: 8 });
    assert.equal(a.status, 201);
    await j(base, 'POST', '/entries', { companyId: 'co1', employeeId: 'e1', date: '2026-01-06', hours: 7.5 });

    const sum = (await j(base, 'GET', '/summary?employeeId=e1&from=2026-01-01&to=2026-01-15')).json;
    assert.equal(sum.hours, 15.5);
    assert.equal(sum.entries, 2);

    const list = (await j(base, 'GET', '/entries?employeeId=e1')).json;
    assert.equal(list.length, 2);

    assert.equal((await j(base, 'DELETE', `/entries/${a.json.id}`)).status, 200);
    assert.equal((await j(base, 'GET', '/entries?employeeId=e1')).json.length, 1);
  });
});

test('validation errors surface as 400', async () => {
  await withServer(async (base) => {
    assert.equal((await j(base, 'POST', '/entries', { companyId: 'co1', employeeId: 'e1', date: 'x', hours: 8 })).status, 400);
    assert.equal((await j(base, 'GET', '/summary?employeeId=e1&from=x&to=y')).status, 400);
  });
});
