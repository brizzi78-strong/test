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

test('API runs a Raleigh payroll end to end', async () => {
  const { base, close } = await startServer();
  try {
    const meta = await get(base, '/meta');
    assert.ok((meta.json as { jurisdictions: string[] }).jurisdictions.includes('raleigh_nc'));

    const company = await post(base, '/companies', { name: 'Globex' });
    assert.equal(company.status, 201);
    const companyId = company.json.id as string;
    assert.equal(company.json.jurisdiction, 'raleigh_nc');

    const employee = await post(base, '/employees', {
      companyId,
      firstName: 'Robin',
      lastName: 'Park',
      payType: 'salary',
      annualSalaryCents: 5200000,
      payFrequency: 'biweekly',
      filingStatus: 'single',
    });
    const employeeId = employee.json.id as string;

    const slip = await post(base, `/employees/${employeeId}/payroll`, { payDate: '2026-01-16' });
    assert.equal(slip.status, 201);
    assert.equal(slip.json.grossCents, 200000);
    assert.equal(slip.json.netCents, 158548);

    const listed = await get(base, `/payslips?employeeId=${employeeId}`);
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

    const badCompany = await post(base, '/companies', { name: 'X', jurisdiction: 'mars' });
    assert.equal(badCompany.status, 400);
  } finally {
    await close();
  }
});
