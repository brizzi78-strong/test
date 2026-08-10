import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VerifyService } from '../service/verifyService.ts';
import { IntakeService } from '../service/intakeService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore, type Store } from '../store/store.ts';
import type { Notifier, OutboundEmail } from '../notify/notifier.ts';

class CapturingNotifier implements Notifier {
  readonly kind = 'test';
  readonly sent: OutboundEmail[] = [];
  async send(email: OutboundEmail): Promise<void> {
    this.sent.push(email);
  }
}

function makeHarness() {
  let seq = 0;
  const store: Store = createInMemoryStore();
  const mailer = new CapturingNotifier();
  const verify = new VerifyService({
    store,
    now: () => new Date('2026-08-08T12:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
    notifier: mailer,
    baseUrl: 'https://verify.example.com',
  });
  const intake = new IntakeService({
    store,
    verify,
    notifier: mailer,
    operatorEmail: 'rob@example.com',
    baseUrl: 'https://verify.example.com',
    now: () => new Date('2026-08-08T12:00:00.000Z'),
    newId: (p) => `${p}_${++seq}`,
  });
  return { store, verify, intake, mailer };
}

const ORDER = {
  requesterName: 'Coretta Vance',
  requesterEmail: 'coretta@example.com',
  companyName: 'Vance Household',
  candidateFirstName: 'Jordan',
  candidateLastName: 'Rivera',
  candidateEmail: 'jordan@example.com',
  sources: [
    { type: 'reference' as const, subject: 'Pat Lee', detail: 'Former manager', contactEmail: 'pat@example.com' },
    { type: 'employment' as const, subject: 'Acme Co', contactEmail: 'hr@acme.example' },
  ],
  note: 'Hiring for in-home care for my mother.',
};

test('a website order contacts NOBODY except the operator', async () => {
  const { intake, mailer } = makeHarness();
  const created = await intake.submit(ORDER);

  assert.equal(created.status, 'pending');
  // Exactly one email, and it went to the operator — not the candidate, not a source.
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'rob@example.com');
  const recipients = mailer.sent.map((m) => m.to);
  assert.ok(!recipients.includes('jordan@example.com'), 'candidate must not be emailed');
  assert.ok(!recipients.includes('pat@example.com'), 'source must not be emailed');
  assert.ok(!recipients.includes('hr@acme.example'), 'source must not be emailed');
  assert.match(mailer.sent[0].text, /Nobody has been contacted yet/);
});

test('an order creates no request, company, or candidate until approved', async () => {
  const { store, intake } = makeHarness();
  await intake.submit(ORDER);
  assert.equal(store.requests.list().length, 0);
  assert.equal(store.companies.list().length, 0);
  assert.equal(store.candidates.list().length, 0);
  assert.equal(store.intakes.list().length, 1);
});

test('approving turns the order into a real, consent-gated request', async () => {
  const { intake, mailer, verify } = makeHarness();
  const { id } = await intake.submit(ORDER);
  mailer.sent.length = 0; // ignore the operator notice

  const request = await intake.approve(id);
  assert.equal(request.status, 'awaiting_consent');
  assert.equal(request.items.length, 2);

  // NOW the candidate is emailed — and still no source, because consent gates that.
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, 'jordan@example.com');

  const stored = intake.get(id);
  assert.equal(stored.status, 'approved');
  assert.equal(stored.requestId, request.id);
  assert.ok(stored.decidedAt);

  // The check is a normal request from here on.
  const view = verify.view(request.id);
  assert.equal(view.company.name, 'Vance Household');
  assert.equal(view.candidate.firstName, 'Jordan');
});

test('declining creates nothing and contacts nobody', async () => {
  const { store, intake, mailer } = makeHarness();
  const { id } = await intake.submit(ORDER);
  mailer.sent.length = 0;

  const declined = intake.decline(id, 'Could not confirm the requester');
  assert.equal(declined.status, 'declined');
  assert.equal(declined.declineReason, 'Could not confirm the requester');
  assert.equal(mailer.sent.length, 0);
  assert.equal(store.requests.list().length, 0);
});

test('an order can only be decided once', async () => {
  const { intake } = makeHarness();
  const a = await intake.submit(ORDER);
  await intake.approve(a.id);
  await assert.rejects(() => intake.approve(a.id), ConflictError);
  assert.throws(() => intake.decline(a.id), ConflictError);

  const b = await intake.submit(ORDER);
  intake.decline(b.id);
  await assert.rejects(() => intake.approve(b.id), ConflictError);
});

test('a repeat client keeps one company, so their portal shows full history', async () => {
  const { store, intake } = makeHarness();
  const first = await intake.submit(ORDER);
  await intake.approve(first.id);
  const second = await intake.submit({ ...ORDER, candidateFirstName: 'Alex', candidateEmail: 'alex@example.com' });
  await intake.approve(second.id);

  const companies = store.companies.list();
  assert.equal(companies.length, 1, 'same client name must not create a second company');
  assert.equal(store.requests.list().filter((r) => r.companyId === companies[0].id).length, 2);
});

test('junk submissions are rejected', async () => {
  const { intake } = makeHarness();
  const bad: Array<[string, unknown]> = [
    ['missing requester', { ...ORDER, requesterName: '' }],
    ['bad requester email', { ...ORDER, requesterEmail: 'not-an-email' }],
    ['bad candidate email', { ...ORDER, candidateEmail: 'nope' }],
    ['no sources', { ...ORDER, sources: [] }],
    ['unknown source type', { ...ORDER, sources: [{ type: 'criminal', subject: 'X', contactEmail: 'a@b.co' }] }],
    ['source missing email', { ...ORDER, sources: [{ type: 'reference', subject: 'X' }] }],
    ['too many sources', { ...ORDER, sources: Array.from({ length: 13 }, () => ORDER.sources[0]) }],
  ];
  for (const [label, input] of bad) {
    await assert.rejects(() => intake.submit(input as never), ValidationError, label);
  }
});

test('oversized text is clamped rather than stored whole', async () => {
  const { intake } = makeHarness();
  const { id } = await intake.submit({ ...ORDER, requesterName: 'A'.repeat(5000), note: 'B'.repeat(9000) });
  const stored = intake.get(id);
  assert.equal(stored.requesterName.length, 200);
  assert.equal(stored.note?.length, 2000);
});

test('a missing company name falls back to the requester', async () => {
  const { intake } = makeHarness();
  const { id } = await intake.submit({ ...ORDER, companyName: '   ' });
  assert.equal(intake.get(id).companyName, 'Coretta Vance');
});

test('the order survives a failing operator notification', async () => {
  let seq = 0;
  const store = createInMemoryStore();
  const exploding: Notifier = {
    kind: 'broken',
    async send() {
      throw new Error('smtp down');
    },
  };
  const verify = new VerifyService({ store, newId: (p) => `${p}_${++seq}`, notifier: exploding, baseUrl: 'x' });
  const intake = new IntakeService({ store, verify, notifier: exploding, operatorEmail: 'rob@example.com' });
  const created = await intake.submit(ORDER);
  assert.equal(created.status, 'pending');
  assert.equal(intake.list({ status: 'pending' }).length, 1);
});

test('the operator queue lists pending orders newest first', async () => {
  let seq = 0;
  const store = createInMemoryStore();
  let clock = new Date('2026-08-01T00:00:00.000Z');
  const verify = new VerifyService({ store, now: () => clock, newId: (p) => `${p}_${++seq}`, baseUrl: 'x' });
  const intake = new IntakeService({ store, verify, now: () => clock, newId: (p) => `${p}_${++seq}` });

  for (const [day, name] of [['01', 'Alpha'], ['05', 'Bravo'], ['09', 'Charlie']] as const) {
    clock = new Date(`2026-08-${day}T00:00:00.000Z`);
    await intake.submit({ ...ORDER, candidateFirstName: name });
  }
  assert.deepEqual(
    intake.list({ status: 'pending' }).map((i) => i.candidateFirstName),
    ['Charlie', 'Bravo', 'Alpha'],
  );
  assert.throws(() => intake.get('intake_nope'), NotFoundError);
});
