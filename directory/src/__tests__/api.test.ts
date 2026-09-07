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

async function req(base: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // Response bodies are objects or arrays depending on the route; `any` keeps
  // these terse test assertions readable.
  return { status: res.status, json: (await res.json()) as any };
}

const post = (base: string, path: string, body?: unknown) => req(base, 'POST', path, body);
const get = (base: string, path: string) => req(base, 'GET', path);

test('API builds an org and answers reporting queries', async () => {
  const { base, close } = await startServer();
  try {
    const company = await post(base, '/companies', { name: 'Globex' });
    const companyId = company.json.id as string;

    const dept = await post(base, '/departments', { companyId, name: 'Engineering' });
    assert.equal(dept.status, 201);

    const ceo = await post(base, '/employees', {
      companyId,
      firstName: 'Dana',
      lastName: 'Cole',
      workEmail: 'dana@globex.com',
      jobTitle: 'CEO',
      employmentType: 'full_time',
      hireDate: '2020-01-01',
    });
    const ceoId = ceo.json.id as string;
    assert.equal(ceo.json.status, 'active');

    const ic = await post(base, '/employees', {
      companyId,
      firstName: 'Robin',
      lastName: 'Park',
      workEmail: 'robin@globex.com',
      jobTitle: 'Engineer',
      employmentType: 'full_time',
      hireDate: '2026-09-01',
      managerId: ceoId,
      departmentId: dept.json.id,
    });
    const icId = ic.json.id as string;

    const reports = await get(base, `/employees/${ceoId}/reports`);
    assert.equal((reports.json as unknown[]).length, 1);

    const chain = await get(base, `/employees/${icId}/reporting-chain`);
    assert.equal((chain.json as Array<{ id: string }>)[0].id, ceoId);

    const onLeave = await post(base, `/employees/${icId}/status`, { to: 'on_leave' });
    assert.equal(onLeave.json.status, 'on_leave');

    const listed = await get(base, `/employees?companyId=${companyId}&status=on_leave`);
    assert.equal((listed.json as unknown[]).length, 1);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/employees/emp_nope');
    assert.equal(missing.status, 404);
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const dupCompany = await post(base, '/companies', { name: 'Acme' });
    const cid = dupCompany.json.id as string;
    const first = await post(base, '/employees', {
      companyId: cid,
      firstName: 'A',
      lastName: 'B',
      workEmail: 'dup@acme.com',
      jobTitle: 'Eng',
      employmentType: 'full_time',
      hireDate: '2026-01-01',
    });
    assert.equal(first.status, 201);
    const dup = await post(base, '/employees', {
      companyId: cid,
      firstName: 'C',
      lastName: 'D',
      workEmail: 'dup@acme.com',
      jobTitle: 'Eng',
      employmentType: 'full_time',
      hireDate: '2026-01-01',
    });
    assert.equal(dup.status, 409);
  } finally {
    await close();
  }
});
