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
  return { status: res.status, json: (await res.json()) as any };
}

async function get(base: string, path: string) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, json: (await res.json()) as any };
}

test('API drives accrue -> request -> approve and reflects the balance', async () => {
  const { base, close } = await startServer();
  try {
    const company = await post(base, '/companies', { name: 'Globex' });
    const companyId = company.json.id as string;
    const employee = await post(base, '/employees', {
      companyId,
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin@globex.com',
    });
    const employeeId = employee.json.id as string;

    await post(base, `/employees/${employeeId}/accrue`, { type: 'vacation', hours: 40 });
    const bal = await get(base, `/employees/${employeeId}/balances/vacation`);
    assert.equal(bal.json.accruedHours, 40);

    const req = await post(base, '/requests', {
      companyId,
      employeeId,
      type: 'vacation',
      startDate: '2026-08-03',
      endDate: '2026-08-04',
      hours: 16,
    });
    assert.equal(req.status, 201);
    assert.equal(req.json.status, 'pending');

    const approved = await post(base, `/requests/${req.json.id}/approve`, { reviewedBy: 'mgr@globex' });
    assert.equal(approved.json.status, 'approved');

    const after = await get(base, `/employees/${employeeId}/balances/vacation`);
    assert.equal(after.json.usedHours, 16);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/requests/req_nope');
    assert.equal(missing.status, 404);
    assert.equal(missing.json.error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const badReq = await post(base, '/requests', { companyId: 'co_nope', employeeId: 'e', type: 'vacation', startDate: '2026-08-03', endDate: '2026-08-03', hours: 8 });
    assert.equal(badReq.status, 404);
  } finally {
    await close();
  }
});
