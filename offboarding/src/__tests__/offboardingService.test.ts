import { test } from 'node:test';
import assert from 'node:assert/strict';

import { OffboardingService } from '../service/offboardingService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new OffboardingService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service };
}

function seedCase(service: OffboardingService, tasks?: any) {
  const company = service.createCompany({ name: 'Acme' });
  const employee = service.createEmployee({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan@acme.com',
  });
  const offboarding = service.createCase({
    companyId: company.id,
    employeeId: employee.id,
    reason: 'voluntary',
    lastDay: '2026-09-30',
    tasks,
  });
  return { company, employee, offboarding };
}

test('a new case is not_started with the default checklist', () => {
  const { service } = makeService();
  const { offboarding } = seedCase(service);
  assert.equal(offboarding.status, 'not_started');
  assert.ok(offboarding.tasks.length >= 5);
  assert.ok(offboarding.tasks.every((t) => t.status === 'pending'));
});

test('completing every task (or marking N/A) completes the case', () => {
  const { service } = makeService();
  const { offboarding } = seedCase(service, ['return_equipment', 'revoke_access', 'cobra_notice']);

  const afterOne = service.completeTask(offboarding.id, 'return_equipment', { by: 'it@acme' });
  assert.equal(afterOne.status, 'in_progress');

  service.completeTask(offboarding.id, 'revoke_access', { by: 'it@acme' });
  const done = service.markTaskNotApplicable(offboarding.id, 'cobra_notice', { by: 'hr@acme', note: 'declined' });
  assert.equal(done.status, 'completed');
  assert.equal(done.tasks.find((t) => t.type === 'cobra_notice')?.status, 'na');
});

test('a task cannot be resolved twice', () => {
  const { service } = makeService();
  const { offboarding } = seedCase(service, ['return_equipment']);
  service.completeTask(offboarding.id, 'return_equipment', { by: 'it@acme' });
  assert.throws(() => service.completeTask(offboarding.id, 'return_equipment', { by: 'it@acme' }), ConflictError);
});

test('a task not on the checklist is a 404', () => {
  const { service } = makeService();
  const { offboarding } = seedCase(service, ['return_equipment']);
  assert.throws(() => service.completeTask(offboarding.id, 'exit_interview', { by: 'x' }), NotFoundError);
});

test('cancel is allowed mid-flight but not after terminal', () => {
  const { service } = makeService();
  const { offboarding } = seedCase(service, ['return_equipment']);
  const cancelled = service.cancelCase(offboarding.id, { reason: 'rehired' });
  assert.equal(cancelled.status, 'cancelled');
  assert.throws(() => service.cancelCase(offboarding.id), ConflictError);
  assert.throws(() => service.completeTask(offboarding.id, 'return_equipment', { by: 'x' }), ConflictError);
});

test('history records the case trail in order', () => {
  const { service } = makeService();
  const { offboarding } = seedCase(service, ['return_equipment', 'revoke_access']);
  service.completeTask(offboarding.id, 'return_equipment', { by: 'it@acme' });
  const done = service.completeTask(offboarding.id, 'revoke_access', { by: 'it@acme' });
  assert.deepEqual(
    done.history.map((h) => h.event),
    ['opened', 'task.done', 'task.done'],
  );
});

test('validation: bad email, bad reason, bad date, unknown task, cross-company', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  assert.throws(
    () => service.createEmployee({ companyId: company.id, firstName: 'A', lastName: 'B', email: 'nope' }),
    ValidationError,
  );
  const emp = service.createEmployee({ companyId: company.id, firstName: 'A', lastName: 'B', email: 'a.b@acme.com' });
  assert.throws(
    () => service.createCase({ companyId: company.id, employeeId: emp.id, reason: 'fired' as never, lastDay: '2026-09-30' }),
    ValidationError,
  );
  assert.throws(
    () => service.createCase({ companyId: company.id, employeeId: emp.id, reason: 'layoff', lastDay: 'Sept 30' }),
    ValidationError,
  );
  assert.throws(
    () => service.createCase({ companyId: company.id, employeeId: emp.id, reason: 'layoff', lastDay: '2026-09-30', tasks: ['party' as never] }),
    ValidationError,
  );

  const other = service.createCompany({ name: 'Other' });
  const outsider = service.createEmployee({ companyId: other.id, firstName: 'C', lastName: 'D', email: 'c.d@other.com' });
  assert.throws(
    () => service.createCase({ companyId: company.id, employeeId: outsider.id, reason: 'layoff', lastDay: '2026-09-30' }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError; list filters by status', () => {
  const { service } = makeService();
  assert.throws(() => service.getCase('case_missing'), NotFoundError);
  const { company, offboarding } = seedCase(service, ['return_equipment']);
  service.completeTask(offboarding.id, 'return_equipment', { by: 'it@acme' });
  assert.equal(service.listCases({ companyId: company.id, status: 'completed' }).length, 1);
  assert.equal(service.listCases({ status: 'not_started' }).length, 0);
});
