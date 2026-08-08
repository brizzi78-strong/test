import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VerifyService } from '../service/verifyService.ts';
import { CertificateService } from '../service/certificate.ts';
import { PortalService } from '../service/portal.ts';
import { NotFoundError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import type { Notifier } from '../notify/notifier.ts';

const silent: Notifier = { kind: 'silent', async send() {} };
const BASE = 'https://verify.example.com';

function makeHarness() {
  let seq = 0;
  const store: Store = createInMemoryStore();
  const svc = new VerifyService({
    store,
    now: () => new Date('2026-08-07T12:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
    notifier: silent,
    baseUrl: BASE,
  });
  const cert = new CertificateService({ store, secret: 'test-secret', baseUrl: BASE });
  const portal = new PortalService({ store, cert, secret: 'test-secret', baseUrl: BASE });
  return { store, svc, cert, portal };
}

/** One company with one check, driven to completion unless told otherwise. */
async function seedCompany(svc: VerifyService, name: string, candidateFirst: string, complete = true) {
  const company = svc.createCompany({ name });
  const candidate = svc.createCandidate({
    companyId: company.id,
    firstName: candidateFirst,
    lastName: 'Rivera',
    email: `${candidateFirst.toLowerCase()}@example.com`,
  });
  const request = await svc.createRequest({
    companyId: company.id,
    candidateId: candidate.id,
    items: [{ type: 'reference', subject: 'Pat Lee', contactEmail: 'pat@example.com' }],
  });
  if (complete) {
    await svc.recordConsent(request.consentToken, { signedName: `${candidateFirst} Rivera` });
    svc.submitVerification(request.items[0].token, { verifierName: 'Pat Lee', confirmed: true });
  }
  return { company, request: svc.getRequest(request.id) };
}

test('accessLink returns a stable, unguessable portal URL', async () => {
  const { svc, portal } = makeHarness();
  const { company } = await seedCompany(svc, 'Carolina Home Care', 'Jordan');

  const link = portal.accessLink(company.id);
  assert.equal(link.companyName, 'Carolina Home Care');
  assert.match(link.token, /^[A-Z2-7]{32}$/);
  assert.equal(link.url, `${BASE}/client/${link.token}`);
  assert.deepEqual(portal.accessLink(company.id), link); // deterministic
  // The token must not be derivable from the id by eye.
  assert.ok(!link.token.includes(company.id.toUpperCase()));
});

test('accessLink throws NotFound for an unknown company', () => {
  const { portal } = makeHarness();
  assert.throws(() => portal.accessLink('co_nope'), NotFoundError);
});

test('history lists the company’s checks with status, result, and tracking number', async () => {
  const { svc, cert, portal } = makeHarness();
  const { company, request } = await seedCompany(svc, 'Carolina Home Care', 'Jordan');
  const { token } = portal.accessLink(company.id);

  const history = portal.history(token);
  assert.equal(history.companyName, 'Carolina Home Care');
  assert.equal(history.reports.length, 1);
  const row = history.reports[0];
  assert.equal(row.requestId, request.id);
  assert.equal(row.candidateName, 'Jordan Rivera');
  assert.equal(row.status, 'completed');
  assert.equal(row.result, 'all_confirmed');
  assert.equal(row.reportReady, true);
  assert.deepEqual(row.progress, { completed: 1, total: 1 });
  assert.equal(row.trackingNumber, cert.reference(request.id).trackingNumber);
  assert.ok(row.consentedAt);
  assert.ok(row.issuedAt);
});

test('an in-progress check shows as not ready, with no issue date', async () => {
  const { svc, portal } = makeHarness();
  const { company } = await seedCompany(svc, 'Carolina Home Care', 'Sam', false);
  const row = portal.history(portal.accessLink(company.id).token).reports[0];
  assert.equal(row.reportReady, false);
  assert.equal(row.result, 'incomplete');
  assert.equal(row.issuedAt, null);
  assert.equal(row.consentedAt, null);
  assert.deepEqual(row.progress, { completed: 0, total: 1 });
});

test('a client sees only their own checks — never another company’s', async () => {
  const { svc, portal } = makeHarness();
  const a = await seedCompany(svc, 'Company A', 'Jordan');
  const b = await seedCompany(svc, 'Company B', 'Taylor');

  const aHistory = portal.history(portal.accessLink(a.company.id).token);
  assert.equal(aHistory.reports.length, 1);
  assert.equal(aHistory.reports[0].candidateName, 'Jordan Rivera');
  assert.ok(!JSON.stringify(aHistory).includes('Taylor'));

  const bHistory = portal.history(portal.accessLink(b.company.id).token);
  assert.equal(bHistory.reports.length, 1);
  assert.equal(bHistory.reports[0].candidateName, 'Taylor Rivera');
  assert.ok(!JSON.stringify(bHistory).includes('Jordan'));
});

test('requestFor refuses another company’s request id — the isolation boundary', async () => {
  const { svc, portal } = makeHarness();
  const a = await seedCompany(svc, 'Company A', 'Jordan');
  const b = await seedCompany(svc, 'Company B', 'Taylor');
  const aToken = portal.accessLink(a.company.id).token;

  // Their own: fine.
  assert.equal(portal.requestFor(aToken, a.request.id).id, a.request.id);
  // Someone else's, even with a valid id: 404, not a leak.
  assert.throws(() => portal.requestFor(aToken, b.request.id), NotFoundError);
  // A nonexistent id: also 404.
  assert.throws(() => portal.requestFor(aToken, 'req_nope'), NotFoundError);
});

test('a bad or empty token is rejected', async () => {
  const { svc, portal } = makeHarness();
  await seedCompany(svc, 'Carolina Home Care', 'Jordan');
  for (const bad of ['', 'AAAA', 'A'.repeat(32), 'not-a-token']) {
    assert.throws(() => portal.history(bad), NotFoundError, `token: ${bad || '(empty)'}`);
  }
});

test('tokens are keyed by the secret — another secret yields a different token', async () => {
  const { store, svc, cert, portal } = makeHarness();
  const { company } = await seedCompany(svc, 'Carolina Home Care', 'Jordan');
  const other = new PortalService({ store, cert, secret: 'a-different-secret', baseUrl: BASE });
  assert.notEqual(portal.accessLink(company.id).token, other.accessLink(company.id).token);
  // And a token minted under one secret does not work under the other.
  assert.throws(() => other.history(portal.accessLink(company.id).token), NotFoundError);
});

test('history is newest-first', async () => {
  let seq = 0;
  const store = createInMemoryStore();
  let clock = new Date('2026-08-01T12:00:00.000Z');
  const svc = new VerifyService({
    store,
    now: () => clock,
    newId: (p) => `${p}_${++seq}`,
    notifier: silent,
    baseUrl: BASE,
  });
  const cert = new CertificateService({ store, secret: 's', baseUrl: BASE });
  const portal = new PortalService({ store, cert, secret: 's', baseUrl: BASE });

  const company = svc.createCompany({ name: 'Carolina Home Care' });
  for (const [day, first] of [['01', 'Alpha'], ['05', 'Bravo'], ['09', 'Charlie']] as const) {
    clock = new Date(`2026-08-${day}T12:00:00.000Z`);
    const cand = svc.createCandidate({
      companyId: company.id, firstName: first, lastName: 'X', email: `${first}@example.com`,
    });
    await svc.createRequest({
      companyId: company.id, candidateId: cand.id,
      items: [{ type: 'reference', subject: 'Ref', contactEmail: 'r@example.com' }],
    });
  }
  const names = portal.history(portal.accessLink(company.id).token).reports.map((r) => r.candidateName);
  assert.deepEqual(names, ['Charlie X', 'Bravo X', 'Alpha X']);
});
