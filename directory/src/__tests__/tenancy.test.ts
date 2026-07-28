/**
 * Per-tenant isolation, exercised over real HTTP. Companies (tenants) are
 * provisioned without a gateway header — as the orchestrator/admin does — then
 * all employee traffic carries a trusted `x-gateway-tenant` header, simulating
 * the gateway. The service must scope every read, list, and write to that
 * tenant.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

async function startServer() {
  const { server } = createApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
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

const emp = (companyId: string, first: string) => ({
  companyId,
  firstName: first,
  lastName: 'Test',
  workEmail: `${first.toLowerCase()}@example.com`,
  jobTitle: 'Engineer',
  employmentType: 'full_time',
  hireDate: '2026-01-01',
});

test('reads, lists, and writes are scoped to the gateway tenant', async () => {
  const { base, close } = await startServer();
  try {
    // Provision two tenants out-of-band (no gateway header), like the orchestrator.
    const coA = await req(base, 'POST', '/companies', { body: { name: 'Acme' } });
    const coB = await req(base, 'POST', '/companies', { body: { name: 'Globex' } });
    const A = coA.json.id as string;
    const B = coB.json.id as string;

    // Each tenant hires through the gateway (its header present).
    const empA = await req(base, 'POST', '/employees', { body: emp(A, 'Ada'), tenant: A });
    const empB = await req(base, 'POST', '/employees', { body: emp(B, 'Grace'), tenant: B });
    assert.equal(empA.status, 201);
    assert.equal(empA.json.companyId, A);
    assert.equal(empB.json.companyId, B);

    // Tenant A lists employees — sees only its own.
    const listA = await req(base, 'GET', '/employees', { tenant: A });
    assert.equal(listA.json.length, 1);
    assert.equal(listA.json[0].id, empA.json.id);

    // Tenant A cannot read tenant B's employee by id — hidden as 404.
    const cross = await req(base, 'GET', `/employees/${empB.json.id}`, { tenant: A });
    assert.equal(cross.status, 404);

    // Tenant A can read its own.
    const own = await req(base, 'GET', `/employees/${empA.json.id}`, { tenant: A });
    assert.equal(own.status, 200);

    // Write-stamping: tenant A claims companyId B in the body — stored under A anyway.
    const sneaky = await req(base, 'POST', '/employees', { body: emp(B, 'Mallory'), tenant: A });
    assert.equal(sneaky.status, 201);
    assert.equal(sneaky.json.companyId, A, 'body companyId must be overridden by the trusted tenant');

    // Tenant A now has two; tenant B still has exactly one (not Mallory).
    assert.equal((await req(base, 'GET', '/employees', { tenant: A })).json.length, 2);
    const listB = await req(base, 'GET', '/employees', { tenant: B });
    assert.equal(listB.json.length, 1);
    assert.equal(listB.json[0].id, empB.json.id);
  } finally {
    await close();
  }
});

test('without a gateway header, nothing is enforced (direct/internal access)', async () => {
  const { base, close } = await startServer();
  try {
    const coA = await req(base, 'POST', '/companies', { body: { name: 'Acme' } });
    const coB = await req(base, 'POST', '/companies', { body: { name: 'Globex' } });
    await req(base, 'POST', '/employees', { body: emp(coA.json.id, 'Ada') });
    await req(base, 'POST', '/employees', { body: emp(coB.json.id, 'Grace') });

    // No header → the orchestrator/admin can see across tenants.
    const all = await req(base, 'GET', '/employees');
    assert.equal(all.json.length, 2);
  } finally {
    await close();
  }
});
