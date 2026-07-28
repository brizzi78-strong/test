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

test('API drives an enrollment to confirmed with a computed premium', async () => {
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
    });
    const employeeId = employee.json.id as string;

    const plan = await post(base, '/plans', {
      companyId,
      type: 'medical',
      name: 'PPO',
      tiers: [
        { tier: 'employee', monthlyCostCents: 10000 },
        { tier: 'family', monthlyCostCents: 30000 },
      ],
    });
    assert.equal(plan.status, 201);
    const planId = plan.json.id as string;

    const enrollment = await post(base, '/enrollments', { companyId, employeeId });
    const enrollmentId = enrollment.json.id as string;
    assert.equal(enrollment.json.status, 'not_started');

    const elected = await post(base, `/enrollments/${enrollmentId}/elect`, {
      type: 'medical',
      planId,
      tier: 'family',
    });
    assert.equal(elected.json.status, 'in_progress');

    const summary = await get(base, `/enrollments/${enrollmentId}/summary`);
    assert.equal((summary.json as { monthlyCostCents: number }).monthlyCostCents, 30000);

    await post(base, `/enrollments/${enrollmentId}/submit`);
    const confirmed = await post(base, `/enrollments/${enrollmentId}/confirm`, { confirmedBy: 'benefits@globex' });
    assert.equal(confirmed.json.status, 'confirmed');
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/enrollments/enr_nope');
    assert.equal(missing.status, 404);
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const badPlan = await post(base, '/plans', { companyId: 'co_nope', type: 'medical', name: 'X', tiers: [] });
    assert.equal(badPlan.status, 404);
  } finally {
    await close();
  }
});
