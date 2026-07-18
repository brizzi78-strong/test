import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DirectoryService } from '../service/directoryService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new DirectoryService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service };
}

function baseEmployee(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Jordan',
    lastName: 'Rivera',
    workEmail: 'jordan.rivera@acme.com',
    jobTitle: 'Engineer',
    employmentType: 'full_time' as const,
    hireDate: '2026-08-01',
    ...overrides,
  };
}

test('create employee starts active with expected fields', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const emp = service.createEmployee({ companyId: company.id, ...baseEmployee() });
  assert.equal(emp.status, 'active');
  assert.equal(emp.workEmail, 'jordan.rivera@acme.com');
});

test('work email must be unique within the company', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  service.createEmployee({ companyId: company.id, ...baseEmployee() });
  assert.throws(
    () => service.createEmployee({ companyId: company.id, ...baseEmployee({ firstName: 'Alex' }) }),
    ConflictError,
  );
  // Same email is fine at a different company.
  const other = service.createCompany({ name: 'Other' });
  const ok = service.createEmployee({ companyId: other.id, ...baseEmployee() });
  assert.ok(ok.id);
});

test('manager must be in the same company and not oneself', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const mgr = service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'm@acme.com' }) });
  const emp = service.createEmployee({
    companyId: company.id,
    ...baseEmployee({ workEmail: 'e@acme.com' }),
    managerId: mgr.id,
  });
  assert.equal(emp.managerId, mgr.id);
  assert.throws(() => service.setManager(emp.id, emp.id), ValidationError);

  const other = service.createCompany({ name: 'Other' });
  const outsider = service.createEmployee({ companyId: other.id, ...baseEmployee({ workEmail: 'o@other.com' }) });
  assert.throws(() => service.setManager(emp.id, outsider.id), ValidationError);
});

test('manager assignment cannot create a reporting cycle', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const a = service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'a@acme.com' }) });
  const b = service.createEmployee({
    companyId: company.id,
    ...baseEmployee({ workEmail: 'b@acme.com' }),
    managerId: a.id,
  });
  const c = service.createEmployee({
    companyId: company.id,
    ...baseEmployee({ workEmail: 'c@acme.com' }),
    managerId: b.id,
  });
  // a -> b -> c already; making a report to c would close the loop.
  assert.throws(() => service.setManager(a.id, c.id), ConflictError);
});

test('reporting chain and direct reports resolve', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const ceo = service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'ceo@acme.com' }) });
  const vp = service.createEmployee({
    companyId: company.id,
    ...baseEmployee({ workEmail: 'vp@acme.com' }),
    managerId: ceo.id,
  });
  const ic = service.createEmployee({
    companyId: company.id,
    ...baseEmployee({ workEmail: 'ic@acme.com' }),
    managerId: vp.id,
  });
  assert.deepEqual(
    service.reportingChain(ic.id).map((e) => e.id),
    [vp.id, ceo.id],
  );
  assert.deepEqual(
    service.directReports(vp.id).map((e) => e.id),
    [ic.id],
  );
});

test('a terminated employee cannot be a manager', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const mgr = service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'm@acme.com' }) });
  service.changeStatus(mgr.id, { to: 'terminated', effectiveDate: '2026-09-01' });
  const emp = service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'e@acme.com' }) });
  assert.throws(() => service.setManager(emp.id, mgr.id), ConflictError);
});

test('employment-status transitions follow the state machine', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const emp = service.createEmployee({ companyId: company.id, ...baseEmployee() });

  const onLeave = service.changeStatus(emp.id, { to: 'on_leave' });
  assert.equal(onLeave.status, 'on_leave');

  const terminated = service.changeStatus(emp.id, { to: 'terminated', effectiveDate: '2026-12-31' });
  assert.equal(terminated.status, 'terminated');
  assert.equal(terminated.terminationDate, '2026-12-31');

  // terminated -> on_leave is illegal
  assert.throws(() => service.changeStatus(emp.id, { to: 'on_leave' }), ConflictError);

  // rehire clears the termination date
  const rehired = service.changeStatus(emp.id, { to: 'active', effectiveDate: '2027-02-01' });
  assert.equal(rehired.status, 'active');
  assert.equal(rehired.terminationDate, undefined);
});

test('department must belong to the same company', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const other = service.createCompany({ name: 'Other' });
  const otherDept = service.createDepartment({ companyId: other.id, name: 'Ops' });
  assert.throws(
    () => service.createEmployee({ companyId: company.id, ...baseEmployee(), departmentId: otherDept.id }),
    ValidationError,
  );
});

test('search and filters narrow the employee list', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const eng = service.createDepartment({ companyId: company.id, name: 'Engineering' });
  service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'a@acme.com', jobTitle: 'Engineer' }), departmentId: eng.id });
  service.createEmployee({ companyId: company.id, ...baseEmployee({ firstName: 'Pat', workEmail: 'b@acme.com', jobTitle: 'Recruiter' }) });

  assert.equal(service.listEmployees({ companyId: company.id }).length, 2);
  assert.equal(service.listEmployees({ departmentId: eng.id }).length, 1);
  assert.equal(service.listEmployees({ companyId: company.id, search: 'recruiter' }).length, 1);
  assert.equal(service.listEmployees({ companyId: company.id, status: 'terminated' }).length, 0);
});

test('validation: bad email, bad hire date, unknown type, unknown ids', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  assert.throws(() => service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'nope' }) }), ValidationError);
  assert.throws(() => service.createEmployee({ companyId: company.id, ...baseEmployee({ hireDate: 'Aug 1' }) }), ValidationError);
  assert.throws(
    () => service.createEmployee({ companyId: company.id, ...baseEmployee({ employmentType: 'gig' as never }) }),
    ValidationError,
  );
  assert.throws(() => service.getEmployee('emp_missing'), NotFoundError);
});

test('updateEmployee enforces email uniqueness on change', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'taken@acme.com' }) });
  const b = service.createEmployee({ companyId: company.id, ...baseEmployee({ workEmail: 'b@acme.com' }) });
  assert.throws(() => service.updateEmployee(b.id, { workEmail: 'taken@acme.com' }), ConflictError);
  const updated = service.updateEmployee(b.id, { jobTitle: 'Staff Engineer' });
  assert.equal(updated.jobTitle, 'Staff Engineer');
});
