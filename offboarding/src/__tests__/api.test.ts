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

test('API drives an offboarding case to completed', async () => {
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

    const c = await post(base, '/cases', {
      companyId,
      employeeId,
      reason: 'voluntary',
      lastDay: '2026-09-30',
      tasks: ['return_equipment', 'revoke_access'],
    });
    assert.equal(c.status, 201);
    const caseId = c.json.id as string;
    assert.equal(c.json.status, 'not_started');

    await post(base, `/cases/${caseId}/tasks/return_equipment/complete`, { by: 'it@globex' });
    const done = await post(base, `/cases/${caseId}/tasks/revoke_access/complete`, { by: 'it@globex' });
    assert.equal(done.json.status, 'completed');

    const listed = await get(base, `/cases?employeeId=${employeeId}&status=completed`);
    assert.equal(listed.json.length, 1);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/cases/case_nope');
    assert.equal(missing.status, 404);
    assert.equal(missing.json.error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const badCase = await post(base, '/cases', { companyId: 'co_nope', employeeId: 'e', reason: 'layoff', lastDay: '2026-09-30' });
    assert.equal(badCase.status, 404);
  } finally {
    await close();
  }
});
