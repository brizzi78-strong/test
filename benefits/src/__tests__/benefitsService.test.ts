import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { PlanTier } from '../domain/types.ts';
import { BenefitsService } from '../service/benefitsService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new BenefitsService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service, clock };
}

const MEDICAL_TIERS: PlanTier[] = [
  { tier: 'employee', monthlyCostCents: 12000 },
  { tier: 'family', monthlyCostCents: 42000 },
];

function seed(service: BenefitsService) {
  const company = service.createCompany({ name: 'Acme, Inc.' });
  const employee = service.createEmployee({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan.rivera@example.com',
  });
  const medical = service.createPlan({
    companyId: company.id,
    type: 'medical',
    name: 'BlueCross PPO',
    carrier: 'BlueCross',
    tiers: MEDICAL_TIERS,
  });
  const dental = service.createPlan({
    companyId: company.id,
    type: 'dental',
    name: 'DeltaDental Basic',
    tiers: [{ tier: 'employee', monthlyCostCents: 2500 }],
  });
  const enrollment = service.startEnrollment({ companyId: company.id, employeeId: employee.id });
  return { company, employee, medical, dental, enrollment };
}

test('enrollment starts not_started with no elections', () => {
  const { service } = makeService();
  const { enrollment } = seed(service);
  assert.equal(enrollment.status, 'not_started');
  assert.equal(enrollment.elections.length, 0);
});

test('full path: elect, waive, submit, confirm — with correct premium', () => {
  const { service } = makeService();
  const { medical, dental, enrollment } = seed(service);

  const afterElect = service.elect(enrollment.id, {
    type: 'medical',
    planId: medical.id,
    tier: 'family',
  });
  assert.equal(afterElect.status, 'in_progress');

  service.waive(enrollment.id, 'dental');

  const summary = service.getSummary(enrollment.id);
  assert.equal(summary.monthlyCostCents, 42000); // family medical only; dental waived

  const submitted = service.submit(enrollment.id);
  assert.equal(submitted.status, 'submitted');
  assert.ok(submitted.submittedAt);

  const confirmed = service.confirm(enrollment.id, { confirmedBy: 'benefits@acme' });
  assert.equal(confirmed.status, 'confirmed');
  assert.ok(confirmed.confirmedAt);
  // Unused plan reference kept out of the total.
  assert.equal(dental.type, 'dental');
});

test('electing again for the same type replaces the prior election', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'family' });
  service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'employee' });
  const summary = service.getSummary(enrollment.id);
  assert.equal(summary.enrollment.elections.length, 1);
  assert.equal(summary.monthlyCostCents, 12000);
});

test('dependents can be added and linked to an election', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  const withDep = service.addDependent(enrollment.id, { name: 'Sam Rivera', relationship: 'spouse' });
  const depId = withDep.dependents[0].id;
  const elected = service.elect(enrollment.id, {
    type: 'medical',
    planId: medical.id,
    tier: 'family',
    dependentIds: [depId],
  });
  assert.deepEqual(elected.elections[0].dependentIds, [depId]);
});

test('electing an unknown dependent is rejected', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  assert.throws(
    () => service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'family', dependentIds: ['dep_nope'] }),
    ValidationError,
  );
});

test('electing a plan of the wrong type or an unoffered tier is rejected', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  assert.throws(
    () => service.elect(enrollment.id, { type: 'dental', planId: medical.id, tier: 'employee' }),
    ValidationError,
  );
  assert.throws(
    () => service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'employee_spouse' }),
    ValidationError,
  );
});

test('cannot submit with no elections; cannot edit after submit until reopened', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  assert.throws(() => service.submit(enrollment.id), ConflictError); // not_started, no elections

  service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'employee' });
  service.submit(enrollment.id);

  assert.throws(() => service.waive(enrollment.id, 'dental'), ConflictError); // submitted, locked

  const reopened = service.reopen(enrollment.id);
  assert.equal(reopened.status, 'in_progress');
  service.waive(enrollment.id, 'dental'); // now allowed
});

test('confirm only from submitted', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'employee' });
  assert.throws(() => service.confirm(enrollment.id, { confirmedBy: 'x' }), ConflictError); // in_progress
});

test('validation: bad email, empty tiers, bad cost, unknown type, cross-company plan', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });

  assert.throws(
    () => service.createEmployee({ companyId: company.id, firstName: 'A', lastName: 'B', email: 'nope' }),
    ValidationError,
  );
  assert.throws(
    () => service.createPlan({ companyId: company.id, type: 'medical', name: 'X', tiers: [] }),
    ValidationError,
  );
  assert.throws(
    () =>
      service.createPlan({
        companyId: company.id,
        type: 'medical',
        name: 'X',
        tiers: [{ tier: 'employee', monthlyCostCents: -5 }],
      }),
    ValidationError,
  );

  const other = service.createCompany({ name: 'Other' });
  const emp = service.createEmployee({ companyId: company.id, firstName: 'C', lastName: 'D', email: 'c.d@example.com' });
  const plan = service.createPlan({
    companyId: other.id,
    type: 'medical',
    name: 'Other Plan',
    tiers: [{ tier: 'employee', monthlyCostCents: 100 }],
  });
  const enrollment = service.startEnrollment({ companyId: company.id, employeeId: emp.id });
  assert.throws(
    () => service.elect(enrollment.id, { type: 'medical', planId: plan.id, tier: 'employee' }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError', () => {
  const { service } = makeService();
  assert.throws(() => service.getEnrollment('enr_missing'), NotFoundError);
  assert.throws(() => service.getPlan('plan_missing'), NotFoundError);
});

test('history records the decision trail', () => {
  const { service } = makeService();
  const { medical, enrollment } = seed(service);
  service.addDependent(enrollment.id, { name: 'Sam Rivera', relationship: 'spouse' });
  service.elect(enrollment.id, { type: 'medical', planId: medical.id, tier: 'family' });
  service.waive(enrollment.id, 'dental');
  service.submit(enrollment.id);
  const confirmed = service.confirm(enrollment.id, { confirmedBy: 'benefits@acme' });
  assert.deepEqual(
    confirmed.history.map((h) => h.event),
    ['started', 'dependent.added', 'elected', 'waived', 'submitted', 'confirmed'],
  );
});
