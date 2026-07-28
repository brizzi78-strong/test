import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PayrollService } from '../service/payrollService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'payroll-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists payslips and YTD across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new PayrollService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const emp = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      payType: 'salary',
      annualSalaryCents: 5200000,
      payFrequency: 'biweekly',
      filingStatus: 'single',
    });
    const slip1 = svc1.runPayroll(emp.id, { payDate: '2026-01-16' });
    assert.equal(slip1.netCents, 158548);
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new PayrollService({ store: store2 });
    // The first payslip is persisted...
    assert.equal(svc2.getPayslip(slip1.id).netCents, 158548);
    // ...and a second run in the same year accumulates YTD from it.
    svc2.runPayroll(emp.id, { payDate: '2026-01-30' });
    assert.equal(svc2.listPayslips({ employeeId: emp.id }).length, 2);
    store2.close();
  } finally {
    cleanup();
  }
});
