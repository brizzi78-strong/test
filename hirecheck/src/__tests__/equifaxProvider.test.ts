import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EquifaxProvider } from '../providers/equifaxProvider.ts';
import type { ProviderSubject } from '../providers/provider.ts';

const subject: ProviderSubject = {
  firstName: 'Jordan',
  lastName: 'Rivera',
  email: 'jordan@example.com',
};

function providerWith(fetchImpl: typeof fetch): EquifaxProvider {
  return new EquifaxProvider({
    baseUrl: 'https://api.equifax.test/',
    apiKey: 'secret',
    fetchImpl,
  });
}

test('maps a clear decision to a clear outcome', async () => {
  const p = providerWith(async () => new Response(JSON.stringify({ decision: 'clear' }), { status: 200 }));
  const out = await p.runCheck('national_criminal', subject);
  assert.equal(out.status, 'clear');
  assert.equal(out.records.length, 0);
});

test('maps a review decision with records to consider', async () => {
  const p = providerWith(
    async () =>
      new Response(JSON.stringify({ decision: 'review', records: [{ summary: 'Misdemeanor found' }] }), {
        status: 200,
      }),
  );
  const out = await p.runCheck('county_criminal', subject);
  assert.equal(out.status, 'consider');
  assert.deepEqual(
    out.records.map((r) => r.summary),
    ['Misdemeanor found'],
  );
});

test('synthesizes a record when a review returns none', async () => {
  const p = providerWith(async () => new Response(JSON.stringify({ decision: 'record_found' }), { status: 200 }));
  const out = await p.runCheck('ssn_trace', subject);
  assert.equal(out.status, 'consider');
  assert.equal(out.records.length, 1);
});

test('degrades to an error outcome on HTTP failure', async () => {
  const p = providerWith(async () => new Response('server error', { status: 500 }));
  const out = await p.runCheck('motor_vehicle_record', subject);
  assert.equal(out.status, 'error');
});

test('degrades to an error outcome on transport failure', async () => {
  const p = providerWith(async () => {
    throw new Error('socket hang up');
  });
  const out = await p.runCheck('global_watchlist', subject);
  assert.equal(out.status, 'error');
});

test('sends bearer auth to the mapped product URL', async () => {
  let capturedUrl: string | undefined;
  let capturedAuth: string | undefined;
  const p = providerWith(async (url, init) => {
    capturedUrl = String(url);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    capturedAuth = headers.authorization;
    return new Response(JSON.stringify({ decision: 'clear' }), { status: 200 });
  });
  await p.runCheck('employment_verification', subject);
  assert.equal(capturedUrl, 'https://api.equifax.test/verification/employment');
  assert.equal(capturedAuth, 'Bearer secret');
});
