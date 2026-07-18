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

test('API drives an application from applied to hired', async () => {
  const { base, close } = await startServer();
  try {
    assert.equal((await get(base, '/health')).status, 200);

    const company = await post(base, '/companies', { name: 'Globex' });
    const companyId = company.json.id as string;

    const req = await post(base, '/requisitions', {
      companyId,
      title: 'Analyst',
      department: 'Finance',
      location: 'Remote',
      employmentType: 'full_time',
    });
    assert.equal(req.status, 201);
    assert.equal(req.json.status, 'open');
    const requisitionId = req.json.id as string;

    const app = await post(base, '/applications', {
      companyId,
      requisitionId,
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin.park@example.com',
    });
    assert.equal(app.status, 201);
    const applicationId = app.json.id as string;
    assert.equal(app.json.stage, 'applied');

    // Skipping stages is a 409.
    const skip = await post(base, `/applications/${applicationId}/advance`, { toStage: 'offer' });
    assert.equal(skip.status, 409);

    await post(base, `/applications/${applicationId}/advance`, { toStage: 'screening' });
    await post(base, `/applications/${applicationId}/advance`, { toStage: 'interview' });
    await post(base, `/applications/${applicationId}/advance`, { toStage: 'offer' });
    const hired = await post(base, `/applications/${applicationId}/hire`, {
      by: 'recruiter@globex',
      fillRequisition: true,
    });
    assert.equal(hired.json.stage, 'hired');

    const reqAfter = await get(base, `/requisitions/${requisitionId}`);
    assert.equal((reqAfter.json as { status: string }).status, 'filled');

    const listed = await get(base, `/applications?requisitionId=${requisitionId}`);
    assert.equal((listed.json as unknown[]).length, 1);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/applications/app_nope');
    assert.equal(missing.status, 404);
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const badReq = await post(base, '/requisitions', { companyId: 'co_nope', title: 'X' });
    assert.equal(badReq.status, 404);
  } finally {
    await close();
  }
});
