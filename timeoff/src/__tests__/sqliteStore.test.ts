import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { TimeOffService } from '../service/timeOffService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'timeoff-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists balances and requests across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new TimeOffService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const employee = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      email: 'jordan@acme.com',
    });
    svc1.accrue(employee.id, { type: 'vacation', hours: 40 });
    const req = svc1.requestTimeOff({
      companyId: company.id,
      employeeId: employee.id,
      type: 'vacation',
      startDate: '2026-08-03',
      endDate: '2026-08-04',
      hours: 16,
    });
    svc1.approveRequest(req.id, { reviewedBy: 'mgr@acme' });
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new TimeOffService({ store: store2 });
    assert.equal(svc2.getRequest(req.id).status, 'approved');
    assert.equal(svc2.getBalance(employee.id, 'vacation').usedHours, 16);
    store2.close();
  } finally {
    cleanup();
  }
});
