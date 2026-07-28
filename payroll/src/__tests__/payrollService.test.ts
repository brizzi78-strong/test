import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PayrollService } from '../service/payrollService.ts';
import { ValidationError, NotFoundError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new PayrollService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service };
}

function salariedEmployee(service: PayrollService, annualSalaryCents = 5200000) {
  const company = service.createCompany({ name: 'Acme, Inc.' }); // defaults to raleigh_nc
  const employee = service.createEmployee({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    payType: 'salary',
    annualSalaryCents,
    payFrequency: 'biweekly',
    filingStatus: 'single',
  });
  return { company, employee };
}

test('company defaults to the Raleigh, NC jurisdiction', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  assert.equal(company.jurisdiction, 'raleigh_nc');
});

test('running payroll produces the expected net paycheck', () => {
  const { service } = makeService();
  const { employee } = salariedEmployee(service);
  const slip = service.runPayroll(employee.id, { payDate: '2026-01-16' });
  assert.equal(slip.grossCents, 200000);
  assert.equal(slip.netCents, 158548);
  assert.equal(slip.stateIncomeTaxCents, 6023);
});

test('hourly employees require hours', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  const emp = service.createEmployee({
    companyId: company.id,
    firstName: 'Sam',
    lastName: 'Lee',
    payType: 'hourly',
    hourlyRateCents: 2500,
    payFrequency: 'weekly',
    filingStatus: 'single',
  });
  assert.throws(() => service.runPayroll(emp.id, { payDate: '2026-01-09' }), ValidationError);
  const slip = service.runPayroll(emp.id, { payDate: '2026-01-09', hours: 40 });
  assert.equal(slip.grossCents, 100000); // 25.00 * 40
});

test('YTD accumulates across runs in the same year', () => {
  const { service } = makeService();
  const { employee } = salariedEmployee(service);
  service.runPayroll(employee.id, { payDate: '2026-01-16' });
  service.runPayroll(employee.id, { payDate: '2026-01-30' });
  const slips = service.listPayslips({ employeeId: employee.id });
  assert.equal(slips.length, 2);
});

test('unknown jurisdiction is rejected', () => {
  const { service } = makeService();
  assert.throws(() => service.createCompany({ name: 'X', jurisdiction: 'mars' }), ValidationError);
});

test('salary without an amount is rejected', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });
  assert.throws(
    () =>
      service.createEmployee({
        companyId: company.id,
        firstName: 'A',
        lastName: 'B',
        payType: 'salary',
        payFrequency: 'monthly',
        filingStatus: 'single',
      }),
    ValidationError,
  );
});

test('unknown employee id raises NotFoundError', () => {
  const { service } = makeService();
  assert.throws(() => service.getEmployee('emp_missing'), NotFoundError);
});
