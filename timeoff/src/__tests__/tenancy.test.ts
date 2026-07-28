/**
 * Per-tenant isolation for a service whose by-id resource is a *sub-resource*
 * (a leave request), exercised over real HTTP. This is the case the review
 * flagged: it confirms that a real `GET /requests/:id` (and a per-employee
 * balances read) actually isolates across tenants, because the returned records
 * carry companyId. Tenants are provisioned without a gateway header (as the
 * orchestrator/admin does); request traffic carries the trusted header.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

async function start() {
  const { server } = createApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function req(base: string, method: string, path: string, opts: { body?: unknown; tenant?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.tenant) headers['x-gateway-tenant'] = opts.tenant;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

test('a leave request is only visible to its own tenant', async () => {
  const { base, close } = await start();
  try {
    // Provision two tenants + an employee each (no gateway header).
    const A = (await req(base, 'POST', '/companies', { body: { name: 'Acme' } })).json.id as string;
    const B = (await req(base, 'POST', '/companies', { body: { name: 'Globex' } })).json.id as string;
    const empA = (await req(base, 'POST', '/employees', { body: { companyId: A, firstName: 'Ada', lastName: 'L', email: 'ada@a.com' } })).json.id as string;
    const empB = (await req(base, 'POST', '/employees', { body: { companyId: B, firstName: 'Grace', lastName: 'H', email: 'grace@b.com' } })).json.id as string;

    const mkReq = (companyId: string, employeeId: string) => ({
      companyId,
      employeeId,
      type: 'vacation',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      hours: 8,
    });

    // Each tenant files a request through the gateway (its header present).
    const reqA = await req(base, 'POST', '/requests', { body: mkReq(A, empA), tenant: A });
    const reqB = await req(base, 'POST', '/requests', { body: mkReq(B, empB), tenant: B });
    assert.equal(reqA.status, 201);
    assert.equal(reqB.status, 201);

    // Tenant A can read its own request…
    assert.equal((await req(base, 'GET', `/requests/${reqA.json.id}`, { tenant: A })).status, 200);
    // …but tenant B's request by id is hidden as 404.
    assert.equal((await req(base, 'GET', `/requests/${reqB.json.id}`, { tenant: A })).status, 404);

    // A tenant can't even file against another tenant's employee (stamped companyId ≠ employee's).
    const sneaky = await req(base, 'POST', '/requests', { body: mkReq(B, empB), tenant: A });
    assert.equal(sneaky.status, 400);

    // Reading another tenant's employee balances yields nothing, not their data.
    const foreignBalances = await req(base, 'GET', `/employees/${empB}/balances`, { tenant: A });
    assert.deepEqual(foreignBalances.json, []);
  } finally {
    await close();
  }
});
