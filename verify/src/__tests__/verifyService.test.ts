import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VerifyService } from '../service/verifyService.ts';
import { ConflictError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-29T12:00:00.000Z') {
  let seq = 0;
  return new VerifyService({
    store: createInMemoryStore(),
    now: () => new Date(start),
    newId: (p) => `${p}_${++seq}`,
  });
}

function seed(svc: VerifyService) {
  const company = svc.createCompany({ name: 'Blue Ridge Press LLC' });
  const candidate = svc.createCandidate({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan@example.com',
  });
  const request = svc.createRequest({
    companyId: company.id,
    candidateId: candidate.id,
    items: [
      { type: 'reference', subject: 'Pat Lee', detail: 'Former manager', contactEmail: 'pat@example.com' },
      { type: 'employment', subject: 'Acme Co', detail: 'Analyst', contactEmail: 'hr@acme.example' },
    ],
  });
  return { company, candidate, request };
}

test('a new request awaits consent and has a token per item', () => {
  const svc = makeService();
  const { request } = seed(svc);
  assert.equal(request.status, 'awaiting_consent');
  assert.equal(request.items.length, 2);
  assert.ok(request.consentToken);
  assert.ok(request.items.every((i) => i.token && i.status === 'pending'));
});

test('nothing can be verified before the candidate consents', () => {
  const svc = makeService();
  const { request } = seed(svc);
  const token = request.items[0].token;
  assert.throws(() => svc.getItemByToken(token), ConflictError); // link not active yet
  assert.throws(() => svc.submitVerification(token, { verifierName: 'Pat' }), ConflictError);
});

test('consent unlocks collection; completing every item completes the request', () => {
  const svc = makeService();
  const { request } = seed(svc);

  const consented = svc.recordConsent(request.consentToken, { signedName: 'Jordan Rivera' });
  assert.equal(consented.status, 'in_progress');
  assert.equal(consented.consent?.signedName, 'Jordan Rivera');

  // A verifier can now load and answer their item.
  const ctx = svc.getItemByToken(request.items[0].token);
  assert.equal(ctx.candidateName, 'Jordan Rivera');
  assert.equal(ctx.item.subject, 'Pat Lee');

  const r1 = svc.submitVerification(request.items[0].token, {
    verifierName: 'Pat Lee',
    confirmed: true,
    answers: { relationship: 'Manager for 3 years', rehire: 'yes' },
  });
  assert.equal(r1.requestCompleted, false); // one item still open

  const r2 = svc.submitVerification(request.items[1].token, { verifierName: 'Acme HR', confirmed: true });
  assert.equal(r2.requestCompleted, true);

  const view = svc.view(request.id);
  assert.equal(view.request.status, 'completed');
  assert.equal(view.progress.completed, 2);
  assert.equal(view.request.items[0].response?.answers.rehire, 'yes');
});

test('an item can be declined, and a used link cannot be answered twice', () => {
  const svc = makeService();
  const { request } = seed(svc);
  svc.recordConsent(request.consentToken, { signedName: 'Jordan Rivera' });
  const token = request.items[0].token;
  svc.submitVerification(token, { verifierName: 'Pat', declined: true });
  assert.equal(svc.getRequest(request.id).items[0].status, 'declined');
  assert.throws(() => svc.submitVerification(token, { verifierName: 'Pat' }), ConflictError);
});

test('consent can only be recorded once, and requests need at least one item', () => {
  const svc = makeService();
  const { company, candidate, request } = seed(svc);
  svc.recordConsent(request.consentToken, { signedName: 'Jordan Rivera' });
  assert.throws(() => svc.recordConsent(request.consentToken, { signedName: 'x' }), ConflictError);
  assert.throws(
    () => svc.createRequest({ companyId: company.id, candidateId: candidate.id, items: [] }),
    ValidationError,
  );
});
