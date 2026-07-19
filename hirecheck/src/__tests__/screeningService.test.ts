import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CHECK_TYPES, type CheckType } from '../domain/types.ts';
import { addBusinessDays, ScreeningService } from '../service/screeningService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';
import { MockProvider } from '../providers/mockProvider.ts';
import type {
  ProviderCheckOutcome,
  ProviderSubject,
  ScreeningProvider,
} from '../providers/provider.ts';

/** Provider stub with a fixed outcome, for deterministic lifecycle tests. */
function fixedProvider(outcome: ProviderCheckOutcome): ScreeningProvider {
  return {
    name: 'fixed',
    async runCheck(): Promise<ProviderCheckOutcome> {
      return { status: outcome.status, records: outcome.records.map((r) => ({ ...r })) };
    },
  };
}

/** Build a service with a controllable clock and sequential ids. */
function makeService(provider: ScreeningProvider, start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new ScreeningService({
    store: createInMemoryStore(),
    provider,
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
    adverseActionWaitingDays: 5,
  });
  const advanceDays = (n: number) => {
    clock.current = new Date(clock.current.getTime() + n * 24 * 60 * 60 * 1000);
  };
  return { service, clock, advanceDays };
}

const STANDARD: CheckType[] = ['ssn_trace', 'national_criminal', 'employment_verification'];

function seedOrder(service: ScreeningService, checkTypes = STANDARD) {
  const company = service.createCompany({ name: 'Acme, Inc.' });
  const candidate = service.createCandidate({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan.rivera@example.com',
    position: 'Warehouse Associate',
  });
  const pkg = service.createPackage({ companyId: company.id, name: 'Standard', checkTypes });
  const order = service.createOrder({
    companyId: company.id,
    candidateId: candidate.id,
    packageId: pkg.id,
  });
  return { company, candidate, pkg, order };
}

test('happy path: authorize -> submit -> adjudicate clear', async () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const { order } = seedOrder(service);

  assert.equal(order.status, 'created');
  assert.equal(order.checks.length, STANDARD.length);
  assert.ok(order.checks.every((c) => c.status === 'pending'));

  service.recordAuthorization(order.id, {
    method: 'e_signature',
    disclosureVersion: 'v1',
  });
  assert.equal(service.getOrder(order.id).status, 'authorized');

  const submitted = await service.submitOrder(order.id);
  assert.equal(submitted.status, 'completed');
  assert.ok(submitted.checks.every((c) => c.status === 'clear'));
  assert.ok(submitted.checks.every((c) => typeof c.completedAt === 'string'));

  const done = service.adjudicate(order.id, { decision: 'clear', adjudicatedBy: 'recruiter@acme' });
  assert.equal(done.status, 'clear');
  assert.equal(done.adjudication?.decision, 'clear');

  // Audit history records each transition.
  assert.deepEqual(
    done.history.map((h) => h.to),
    ['authorized', 'in_progress', 'completed', 'clear'],
  );
});

test('cannot submit before authorization is recorded', async () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const { order } = seedOrder(service);
  await assert.rejects(() => service.submitOrder(order.id), ConflictError);
  assert.equal(service.getOrder(order.id).status, 'created');
});

test('adverse path enforces the pre-adverse waiting period', async () => {
  const { service, advanceDays } = makeService(
    fixedProvider({ status: 'consider', records: [{ summary: 'record found' }] }),
  );
  const { order } = seedOrder(service);
  service.recordAuthorization(order.id, { method: 'e_signature', disclosureVersion: 'v1' });

  const submitted = await service.submitOrder(order.id);
  assert.equal(submitted.status, 'completed');
  assert.ok(submitted.checks.every((c) => c.status === 'consider'));

  const preAdverse = service.adjudicate(order.id, {
    decision: 'adverse',
    adjudicatedBy: 'compliance@acme',
    notes: 'criminal record relevant to role',
  });
  assert.equal(preAdverse.status, 'pre_adverse_action');
  assert.ok(preAdverse.adverseAction?.earliestFinalAt);

  // Finalizing before the window closes is rejected.
  assert.throws(() => service.finalizeAdverseAction(order.id), ConflictError);

  // After the waiting period, final adverse action is allowed.
  advanceDays(8);
  const final = service.finalizeAdverseAction(order.id, { reason: 'adjudication upheld' });
  assert.equal(final.status, 'adverse_action');
  assert.ok(final.adverseAction?.adverseAt);
});

test('candidate can be cleared after disputing during the window', async () => {
  const { service } = makeService(
    fixedProvider({ status: 'consider', records: [{ summary: 'record found' }] }),
  );
  const { order } = seedOrder(service);
  service.recordAuthorization(order.id, { method: 'e_signature', disclosureVersion: 'v1' });
  await service.submitOrder(order.id);
  service.adjudicate(order.id, { decision: 'adverse', adjudicatedBy: 'compliance@acme' });

  const cleared = service.clearAfterDispute(order.id, {
    by: 'compliance@acme',
    note: 'record belonged to a different person',
  });
  assert.equal(cleared.status, 'clear');
});

test('adjudicate is rejected unless the order is completed', async () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const { order } = seedOrder(service);
  assert.throws(
    () => service.adjudicate(order.id, { decision: 'clear', adjudicatedBy: 'x' }),
    ConflictError,
  );
});

test('cancel is allowed mid-flight but not after a terminal state', async () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const { order } = seedOrder(service);
  const canceled = service.cancelOrder(order.id, { reason: 'req withdrawn' });
  assert.equal(canceled.status, 'canceled');
  assert.throws(() => service.cancelOrder(order.id), ConflictError);
});

test('validation: bad email, empty package, unknown check type, cross-company', () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const company = service.createCompany({ name: 'Acme' });

  assert.throws(
    () =>
      service.createCandidate({
        companyId: company.id,
        firstName: 'A',
        lastName: 'B',
        email: 'not-an-email',
        position: 'Role',
      }),
    ValidationError,
  );

  assert.throws(
    () => service.createPackage({ companyId: company.id, name: 'Empty', checkTypes: [] }),
    ValidationError,
  );

  assert.throws(
    () =>
      service.createPackage({
        companyId: company.id,
        name: 'Bad',
        checkTypes: ['teleportation' as CheckType],
      }),
    ValidationError,
  );

  const other = service.createCompany({ name: 'Other' });
  const cand = service.createCandidate({
    companyId: other.id,
    firstName: 'C',
    lastName: 'D',
    email: 'c.d@example.com',
    position: 'Role',
  });
  const pkg = service.createPackage({
    companyId: company.id,
    name: 'Std',
    checkTypes: ['ssn_trace'],
  });
  assert.throws(
    () => service.createOrder({ companyId: company.id, candidateId: cand.id, packageId: pkg.id }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError', () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  assert.throws(() => service.getOrder('ord_missing'), NotFoundError);
});

test('duplicate check types in a package are de-duplicated', () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const company = service.createCompany({ name: 'Acme' });
  const pkg = service.createPackage({
    companyId: company.id,
    name: 'Dupes',
    checkTypes: ['ssn_trace', 'ssn_trace', 'national_criminal'],
  });
  assert.deepEqual(pkg.checkTypes, ['ssn_trace', 'national_criminal']);
});

test('listOrders filters by company and status', async () => {
  const { service } = makeService(fixedProvider({ status: 'clear', records: [] }));
  const { order, company } = seedOrder(service);
  service.recordAuthorization(order.id, { method: 'e_signature', disclosureVersion: 'v1' });
  await service.submitOrder(order.id);

  assert.equal(service.listOrders({ companyId: company.id }).length, 1);
  assert.equal(service.listOrders({ status: 'completed' }).length, 1);
  assert.equal(service.listOrders({ status: 'clear' }).length, 0);
});

test('MockProvider is deterministic and honors forcing keywords', async () => {
  const provider = new MockProvider();
  const subject: ProviderSubject = {
    firstName: 'Sam',
    lastName: 'Lee',
    email: 'sam.lee@example.com',
  };
  const a = await provider.runCheck('national_criminal', subject);
  const b = await provider.runCheck('national_criminal', subject);
  assert.equal(a.status, b.status);

  const consider = await provider.runCheck('national_criminal', {
    ...subject,
    email: 'needs.consider@example.com',
  });
  assert.equal(consider.status, 'consider');

  const errored = await provider.runCheck('national_criminal', {
    ...subject,
    email: 'error.case@example.com',
  });
  assert.equal(errored.status, 'error');
});

test('identity_verification is a supported, consent-gated check type', async () => {
  // Available for building packages (e.g. screening in-home service workers).
  assert.ok(CHECK_TYPES.includes('identity_verification'));

  // The provider resolves it like any other check — here forced to `consider`.
  const provider = new MockProvider();
  const outcome = await provider.runCheck('identity_verification', {
    firstName: 'Sam',
    lastName: 'Lee',
    email: 'needs.consider@example.com',
  });
  assert.equal(outcome.status, 'consider');
  assert.match(outcome.records[0].summary, /Identity/i);
});

test('addBusinessDays skips weekends', () => {
  const monday = new Date('2024-01-01T09:00:00.000Z'); // Monday
  assert.equal(addBusinessDays(monday, 5).toISOString(), '2024-01-08T09:00:00.000Z');
  const friday = new Date('2024-01-05T09:00:00.000Z'); // Friday
  assert.equal(addBusinessDays(friday, 1).toISOString(), '2024-01-08T09:00:00.000Z');
});
