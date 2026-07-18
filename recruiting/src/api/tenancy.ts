/**
 * Per-tenant isolation.
 *
 * The API gateway authenticates every request and injects a trusted
 * `x-gateway-tenant` header (stripping any client-supplied one), so the presence
 * of that header means "scope everything to this tenant". Services enforce it
 * generically, without every route having to know about tenancy:
 *
 *   - writes are stamped with the tenant's companyId, so a caller can only
 *     create or update records under its own tenant;
 *   - list reads are constrained to the tenant via the companyId filter;
 *   - responses are filtered to the tenant — arrays drop other tenants' rows,
 *     and a single record owned by another tenant becomes a 404.
 *
 * When the header is absent (direct/local access, or internal calls from the
 * orchestrator — not through the gateway), nothing is enforced; in production
 * only the gateway is exposed publicly.
 *
 * Records are matched on their `companyId` field. Objects without one (health,
 * meta, or a company/tenant-root entity whose own id is the tenant) are left
 * untouched.
 *
 * Residual: a targeted mutation of another tenant's record by its opaque id
 * still persists before the response is hidden as a 404 — closing that fully
 * needs a per-service ownership check at the store layer. Reads, list queries,
 * and record creation are fully isolated here.
 */

import type { IncomingHttpHeaders } from 'node:http';

const TENANT_HEADER = 'x-gateway-tenant';

/** The trusted tenant for this request, or null when not behind the gateway. */
export function readTenant(headers: IncomingHttpHeaders): string | null {
  const raw = headers[TENANT_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/** Constrain the request to the tenant: force the list filter and stamp writes. */
export function scopeRequestToTenant(tenant: string, query: URLSearchParams, body: unknown): void {
  query.set('companyId', tenant);
  if (isRecord(body)) body.companyId = tenant;
}

/** Filter a handler result to the tenant, hiding other tenants' records. */
export function scopeResultToTenant(
  tenant: string,
  status: number,
  body: unknown,
): { status: number; body: unknown } {
  if (Array.isArray(body)) {
    return { status, body: body.filter((row) => belongsTo(row, tenant)) };
  }
  if (isRecord(body) && typeof body.companyId === 'string' && body.companyId !== tenant) {
    return { status: 404, body: { error: { code: 'not_found', message: 'route not found' } } };
  }
  return { status, body };
}

function belongsTo(row: unknown, tenant: string): boolean {
  return !isRecord(row) || typeof row.companyId !== 'string' || row.companyId === tenant;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
