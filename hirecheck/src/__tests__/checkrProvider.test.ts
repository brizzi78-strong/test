/**
 * Checkr adapter: verify Basic auth, the candidate -> report call sequence, the
 * check-type -> package mapping (including drug screening), and the mapping of
 * Checkr's clear / consider / pending results — all against a scripted fetch.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CheckrProvider } from '../providers/checkrProvider.ts';
import type { CheckType } from '../domain/types.ts';

const subject = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.com' };

/** Build a fake fetch that records calls and returns queued JSON responses. */
function fakeFetch(script: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const r = script[i++] ?? { body: {} };
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

test('runs a candidate then report, with Basic auth and the mapped package', async () => {
  const { impl, calls } = fakeFetch([
    { body: { id: 'cand_123' } }, // POST /candidates
    { body: { id: 'rep_1', status: 'complete', result: 'clear' } }, // POST /reports
  ]);
  const p = new CheckrProvider({ apiKey: 'test_key', fetchImpl: impl });
  const outcome = await p.runCheck('drug_screen', subject);

  assert.equal(outcome.status, 'clear');
  // Two calls: candidates then reports.
  assert.match(calls[0].url, /\/v1\/candidates$/);
  assert.match(calls[1].url, /\/v1\/reports$/);
  // Basic auth = base64("test_key:").
  const expectedAuth = 'Basic ' + Buffer.from('test_key:').toString('base64');
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, expectedAuth);
  // Drug screen maps to Checkr's drug_screening package.
  assert.equal(JSON.parse(calls[1].init.body as string).package, 'drug_screening');
  assert.equal(JSON.parse(calls[1].init.body as string).candidate_id, 'cand_123');
});

test('maps a consider result to a review outcome with a record', async () => {
  const { impl } = fakeFetch([
    { body: { id: 'cand_1' } },
    { body: { id: 'rep_2', status: 'complete', result: 'consider' } },
  ]);
  const p = new CheckrProvider({ apiKey: 'k', fetchImpl: impl });
  const outcome = await p.runCheck('national_criminal', subject);
  assert.equal(outcome.status, 'consider');
  assert.equal(outcome.records.length, 1);
  assert.match(outcome.records[0].summary, /consider/i);
});

test('a still-pending report degrades to an error that points at the webhook', async () => {
  const { impl } = fakeFetch([
    { body: { id: 'cand_1' } },
    { body: { id: 'rep_3', status: 'pending' } }, // no result yet
  ]);
  const p = new CheckrProvider({ apiKey: 'k', fetchImpl: impl });
  const outcome = await p.runCheck('county_criminal', subject);
  assert.equal(outcome.status, 'error');
  assert.match(outcome.records[0].summary, /pending/i);
});

test('an HTTP error degrades to an error outcome, never throws', async () => {
  const { impl } = fakeFetch([{ ok: false, status: 401, body: { error: 'bad key' } }]);
  const p = new CheckrProvider({ apiKey: 'k', fetchImpl: impl });
  const outcome = await p.runCheck('ssn_trace', subject);
  assert.equal(outcome.status, 'error');
  assert.match(outcome.records[0].summary, /Checkr request failed/);
});

test('mapReport can be reused directly on a report.completed webhook payload', () => {
  const p = new CheckrProvider({ apiKey: 'k' });
  const t: CheckType = 'employment_verification';
  assert.equal(p.mapReport(t, { status: 'complete', result: 'clear' }).status, 'clear');
  assert.equal(p.mapReport(t, { status: 'complete', result: 'consider' }).status, 'consider');
});
