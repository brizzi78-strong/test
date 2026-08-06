import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VerifyService } from '../service/verifyService.ts';
import { CertificateService } from '../service/certificate.ts';
import { NotFoundError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import type { Notifier, OutboundEmail } from '../notify/notifier.ts';

class SilentNotifier implements Notifier {
  readonly kind = 'test';
  readonly sent: OutboundEmail[] = [];
  async send(email: OutboundEmail): Promise<void> {
    this.sent.push(email);
  }
}

const SECRET = 'test-secret-abc';
const BASE = 'https://verify.example.com';

function makeHarness(start = '2026-07-29T12:00:00.000Z') {
  let seq = 0;
  const store: Store = createInMemoryStore();
  const svc = new VerifyService({
    store,
    now: () => new Date(start),
    newId: (p) => `${p}_${++seq}`,
    notifier: new SilentNotifier(),
    baseUrl: BASE,
  });
  const cert = new CertificateService({ store, secret: SECRET, baseUrl: BASE });
  return { store, svc, cert };
}

/** Seed a request and drive it to the given completion state. */
async function seed(svc: VerifyService, opts: { complete?: boolean; declineSecond?: boolean } = {}) {
  const company = svc.createCompany({ name: 'Blue Ridge Press LLC' });
  const candidate = svc.createCandidate({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan@example.com',
  });
  const request = await svc.createRequest({
    companyId: company.id,
    candidateId: candidate.id,
    items: [
      { type: 'reference', subject: 'Pat Lee', detail: 'Former manager', contactEmail: 'pat@example.com' },
      { type: 'employment', subject: 'Acme Co', detail: 'Analyst', contactEmail: 'hr@acme.example' },
    ],
  });
  if (opts.complete) {
    await svc.recordConsent(request.consentToken, { signedName: 'Jordan Rivera' });
    svc.submitVerification(request.items[0].token, { verifierName: 'Pat Lee', confirmed: true });
    if (opts.declineSecond) svc.submitVerification(request.items[1].token, { verifierName: 'Acme HR', declined: true });
    else svc.submitVerification(request.items[1].token, { verifierName: 'Acme HR', confirmed: true });
  }
  return { company, candidate, request: svc.getRequest(request.id) };
}

test('reference() yields a stable tracking number, code, and verify URL', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc);

  const ref = cert.reference(request.id);
  assert.match(ref.trackingNumber, /^BRP-2026-[A-Z2-7]{6}$/);
  assert.match(ref.verificationCode, /^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
  assert.ok(ref.verifyUrl.startsWith(`${BASE}/verify?ref=`));
  assert.ok(ref.verifyUrl.includes(`ref=${encodeURIComponent(ref.trackingNumber)}`));
  assert.ok(ref.verifyUrl.includes(`code=${encodeURIComponent(ref.verificationCode)}`));

  // Deterministic: same inputs, same outputs (survives restart).
  assert.deepEqual(cert.reference(request.id), ref);
});

test('reference() throws NotFound for an unknown request', () => {
  const { cert } = makeHarness();
  assert.throws(() => cert.reference('nope'), NotFoundError);
});

test('certificate() by tracking number returns a privacy-preserving all_confirmed record', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true });
  const ref = cert.reference(request.id);

  const c = cert.certificate(ref.trackingNumber, ref.verificationCode);
  assert.equal(c.authentic, true);
  assert.equal(c.issuer, 'Blue Ridge Press LLC');
  assert.equal(c.trackingNumber, ref.trackingNumber);
  assert.equal(c.status, 'completed');
  assert.equal(c.requestedBy, 'Blue Ridge Press LLC');
  assert.equal(c.candidateInitials, 'JR'); // initials only — no full name
  assert.deepEqual(c.scope, ['employment', 'reference']);
  assert.deepEqual(c.sources, { total: 2, confirmed: 2, declined: 0, pending: 0 });
  assert.equal(c.result, 'all_confirmed');
  assert.equal(c.integrity.algorithm, 'HMAC-SHA256');
  assert.match(c.integrity.hash, /^[0-9a-f]{64}$/);
  assert.ok(c.issuedAt);

  // Must not leak identifying detail.
  const blob = JSON.stringify(c);
  assert.ok(!blob.includes('Jordan'));
  assert.ok(!blob.includes('Rivera'));
  assert.ok(!blob.includes('Pat Lee'));
});

test('certificate() resolves by raw request id as well as tracking number', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true });
  const ref = cert.reference(request.id);
  const byId = cert.certificate(request.id, ref.verificationCode);
  const byTrack = cert.certificate(ref.trackingNumber, ref.verificationCode);
  assert.deepEqual(byId, byTrack);
});

test('a declined source makes the result partial', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true, declineSecond: true });
  const ref = cert.reference(request.id);
  const c = cert.certificate(ref.trackingNumber, ref.verificationCode);
  assert.deepEqual(c.sources, { total: 2, confirmed: 1, declined: 1, pending: 0 });
  assert.equal(c.result, 'partial');
});

test('an incomplete request reports incomplete with no issue date', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc); // never consented / completed
  const ref = cert.reference(request.id);
  const c = cert.certificate(ref.trackingNumber, ref.verificationCode);
  assert.equal(c.result, 'incomplete');
  assert.equal(c.issuedAt, null);
  assert.deepEqual(c.sources, { total: 2, confirmed: 0, declined: 0, pending: 2 });
});

test('a wrong code is indistinguishable from a missing report (both NotFound)', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true });
  const ref = cert.reference(request.id);

  assert.throws(() => cert.certificate(ref.trackingNumber, 'WRNG-CODE'), NotFoundError);
  assert.throws(() => cert.certificate(ref.trackingNumber, null), NotFoundError);
  assert.throws(() => cert.certificate('BRP-2026-XXXXXX', ref.verificationCode), NotFoundError);
});

test('the code check ignores case and separator formatting', async () => {
  const { svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true });
  const ref = cert.reference(request.id);
  const messy = ref.verificationCode.toLowerCase().replace('-', ' ');
  const c = cert.certificate(ref.trackingNumber, messy);
  assert.equal(c.authentic, true);
});

test('editing a finding after issue breaks the integrity seal', async () => {
  const { store, svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true });
  const ref = cert.reference(request.id);
  const before = cert.certificate(ref.trackingNumber, ref.verificationCode).integrity.hash;

  // Tamper with a stored answer.
  const stored = store.requests.get(request.id)!;
  stored.items[0].response = { ...stored.items[0].response!, confirmed: false };
  store.requests.put(stored);

  const after = cert.certificate(ref.trackingNumber, ref.verificationCode).integrity.hash;
  assert.notEqual(before, after);
});

test('the seal is keyed by the secret — a different secret yields a different hash', async () => {
  const { store, svc, cert } = makeHarness();
  const { request } = await seed(svc, { complete: true });
  const ref = cert.reference(request.id);
  const mine = cert.certificate(ref.trackingNumber, ref.verificationCode).integrity.hash;

  const other = new CertificateService({ store, secret: 'a-different-secret', baseUrl: BASE });
  const theirs = other.integrity(store.requests.get(request.id)!,
    store.candidates.get(request.candidateId), store.companies.get(request.companyId));
  assert.notEqual(mine, theirs);
});
