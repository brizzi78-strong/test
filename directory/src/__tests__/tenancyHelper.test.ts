/**
 * Contract tests for the shared tenancy helper (src/api/tenancy.ts). This file
 * is byte-identical across every service, so pinning its behavior here locks the
 * isolation contract the whole platform relies on:
 *
 *   - writes are stamped to the tenant;
 *   - list queries are forced to the tenant;
 *   - a record owned by another tenant is hidden (single → 404, array → filtered);
 *   - objects WITHOUT a companyId (health, meta, tenant-root entities) pass through.
 *
 * The last point is the documented limitation: isolation only covers entities
 * that carry a top-level companyId, so this test also serves as the guard that
 * flags if that contract ever changes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readTenant, scopeRequestToTenant, scopeResultToTenant } from '../api/tenancy.ts';

test('readTenant extracts the trusted header, or null when absent', () => {
  assert.equal(readTenant({ 'x-gateway-tenant': 'co_a' }), 'co_a');
  assert.equal(readTenant({ 'x-gateway-tenant': '  co_a  ' }), 'co_a');
  assert.equal(readTenant({ 'x-gateway-tenant': ['co_a', 'co_b'] }), 'co_a');
  assert.equal(readTenant({}), null);
  assert.equal(readTenant({ 'x-gateway-tenant': '' }), null);
  assert.equal(readTenant({ 'x-gateway-tenant': '   ' }), null);
});

test('scopeRequestToTenant forces the list filter and stamps the write body', () => {
  const query = new URLSearchParams('companyId=co_evil&status=active');
  const body: Record<string, unknown> = { companyId: 'co_evil', firstName: 'Mallory' };
  scopeRequestToTenant('co_a', query, body);
  assert.equal(query.get('companyId'), 'co_a');
  assert.equal(query.get('status'), 'active');
  assert.equal(body.companyId, 'co_a');

  // A query without companyId gains it.
  const q2 = new URLSearchParams('');
  scopeRequestToTenant('co_a', q2, undefined);
  assert.equal(q2.get('companyId'), 'co_a');

  // Non-object bodies are left alone (no throw).
  assert.doesNotThrow(() => scopeRequestToTenant('co_a', new URLSearchParams(), null));
  assert.doesNotThrow(() => scopeRequestToTenant('co_a', new URLSearchParams(), [1, 2, 3]));
});

test('scopeResultToTenant hides another tenant’s single record as 404', () => {
  const foreign = scopeResultToTenant('co_a', 200, { id: 'e1', companyId: 'co_b' });
  assert.equal(foreign.status, 404);
  assert.deepEqual(foreign.body, { error: { code: 'not_found', message: 'route not found' } });

  const own = scopeResultToTenant('co_a', 200, { id: 'e1', companyId: 'co_a' });
  assert.equal(own.status, 200);
  assert.deepEqual(own.body, { id: 'e1', companyId: 'co_a' });
});

test('scopeResultToTenant filters arrays to the tenant', () => {
  const rows = [
    { id: '1', companyId: 'co_a' },
    { id: '2', companyId: 'co_b' },
    { id: '3', companyId: 'co_a' },
  ];
  const scoped = scopeResultToTenant('co_a', 200, rows);
  assert.equal(scoped.status, 200);
  assert.deepEqual((scoped.body as Array<{ id: string }>).map((r) => r.id), ['1', '3']);
});

test('objects without a companyId pass through untouched (health, meta, tenant-root)', () => {
  assert.deepEqual(scopeResultToTenant('co_a', 200, { status: 'ok' }), { status: 200, body: { status: 'ok' } });
  // A company/tenant-root entity keyed by its own id (no companyId field) is NOT
  // filtered — this is the documented limitation, pinned so a change is noticed.
  const company = { id: 'co_b', name: 'Globex' };
  assert.deepEqual(scopeResultToTenant('co_a', 200, company), { status: 200, body: company });
});
