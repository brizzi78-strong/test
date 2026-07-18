import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TimeOffService } from '../service/timeOffService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new TimeOffService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service };
}

function seed(service: TimeOffService) {
  const company = service.createCompany({ name: 'Acme' });
  const employee = service.createEmployee({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan@acme.com',
  });
  return { company, employee };
}

test('new balance is zero and accrual adds hours', () => {
  const { service } = makeService();
  const { employee } = seed(service);
  assert.equal(service.getBalance(employee.id, 'vacation').accruedHours, 0);
  const b = service.accrue(employee.id, { type: 'vacation', hours: 40 });
  assert.equal(b.accruedHours, 40);
  assert.equal(b.usedHours, 0);
});

test('approving a request deducts from the balance', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  service.accrue(employee.id, { type: 'vacation', hours: 40 });
  const req = service.requestTimeOff({
    companyId: company.id,
    employeeId: employee.id,
    type: 'vacation',
    startDate: '2026-08-03',
    endDate: '2026-08-04',
    hours: 16,
  });
  assert.equal(req.status, 'pending');
  const approved = service.approveRequest(req.id, { reviewedBy: 'mgr@acme' });
  assert.equal(approved.status, 'approved');
  const bal = service.getBalance(employee.id, 'vacation');
  assert.equal(bal.usedHours, 16);
  assert.equal(bal.accruedHours - bal.usedHours, 24); // available
});

test('approval is blocked when the balance is insufficient', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  service.accrue(employee.id, { type: 'vacation', hours: 8 });
  const req = service.requestTimeOff({
    companyId: company.id,
    employeeId: employee.id,
    type: 'vacation',
    startDate: '2026-08-03',
    endDate: '2026-08-05',
    hours: 24,
  });
  assert.throws(() => service.approveRequest(req.id, { reviewedBy: 'mgr@acme' }), ConflictError);
});

test('a policy can allow a negative balance', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  service.createPolicy({
    companyId: company.id,
    type: 'sick',
    name: 'Sick',
    annualAccrualHours: 40,
    allowNegativeBalance: true,
  });
  const req = service.requestTimeOff({
    companyId: company.id,
    employeeId: employee.id,
    type: 'sick',
    startDate: '2026-08-03',
    endDate: '2026-08-03',
    hours: 8,
  });
  const approved = service.approveRequest(req.id, { reviewedBy: 'mgr@acme' });
  assert.equal(approved.status, 'approved');
  assert.equal(service.getBalance(employee.id, 'sick').usedHours, 8); // went negative-available
});

test('cancelling an approved request refunds the hours', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  service.accrue(employee.id, { type: 'vacation', hours: 40 });
  const req = service.requestTimeOff({
    companyId: company.id,
    employeeId: employee.id,
    type: 'vacation',
    startDate: '2026-08-03',
    endDate: '2026-08-04',
    hours: 16,
  });
  service.approveRequest(req.id, { reviewedBy: 'mgr@acme' });
  assert.equal(service.getBalance(employee.id, 'vacation').usedHours, 16);
  const cancelled = service.cancelRequest(req.id, { by: 'jordan@acme' });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(service.getBalance(employee.id, 'vacation').usedHours, 0); // refunded
});

test('accrual is capped by the policy maxBalanceHours', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  service.createPolicy({
    companyId: company.id,
    type: 'vacation',
    name: 'Vacation',
    annualAccrualHours: 80,
    maxBalanceHours: 60,
  });
  service.accrue(employee.id, { type: 'vacation', hours: 50 });
  const b = service.accrue(employee.id, { type: 'vacation', hours: 50 }); // would be 100
  assert.equal(b.accruedHours, 60); // capped
});

test('a denied or cancelled request is terminal', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  const req = service.requestTimeOff({
    companyId: company.id,
    employeeId: employee.id,
    type: 'personal',
    startDate: '2026-08-03',
    endDate: '2026-08-03',
    hours: 8,
  });
  service.denyRequest(req.id, { reviewedBy: 'mgr@acme', reason: 'blackout period' });
  assert.throws(() => service.approveRequest(req.id, { reviewedBy: 'mgr@acme' }), ConflictError);
});

test('validation: bad email, bad type, non-positive hours, reversed dates', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  assert.throws(
    () => service.createEmployee({ companyId: company.id, firstName: 'A', lastName: 'B', email: 'nope' }),
    ValidationError,
  );
  const emp = service.createEmployee({ companyId: company.id, firstName: 'A', lastName: 'B', email: 'a.b@acme.com' });
  assert.throws(() => service.accrue(emp.id, { type: 'holiday' as never, hours: 8 }), ValidationError);
  assert.throws(
    () =>
      service.requestTimeOff({
        companyId: company.id,
        employeeId: emp.id,
        type: 'vacation',
        startDate: '2026-08-05',
        endDate: '2026-08-03',
        hours: 8,
      }),
    ValidationError,
  );
  assert.throws(
    () =>
      service.requestTimeOff({
        companyId: company.id,
        employeeId: emp.id,
        type: 'vacation',
        startDate: '2026-08-03',
        endDate: '2026-08-03',
        hours: 0,
      }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError', () => {
  const { service } = makeService();
  assert.throws(() => service.getRequest('req_missing'), NotFoundError);
});

test('listRequests filters by status', () => {
  const { service } = makeService();
  const { company, employee } = seed(service);
  service.accrue(employee.id, { type: 'vacation', hours: 40 });
  const r = service.requestTimeOff({
    companyId: company.id,
    employeeId: employee.id,
    type: 'vacation',
    startDate: '2026-08-03',
    endDate: '2026-08-03',
    hours: 8,
  });
  service.approveRequest(r.id, { reviewedBy: 'mgr@acme' });
  assert.equal(service.listRequests({ companyId: company.id, status: 'approved' }).length, 1);
  assert.equal(service.listRequests({ status: 'pending' }).length, 0);
});
