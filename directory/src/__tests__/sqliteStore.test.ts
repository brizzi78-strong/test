import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DirectoryService } from '../service/directoryService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'directory-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists data across a simulated restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    // --- first "process": write some data, then close the DB ---
    const store1 = createSqliteStore(path);
    const svc1 = new DirectoryService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const mgr = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Dana',
      lastName: 'Cole',
      workEmail: 'dana@acme.com',
      jobTitle: 'CEO',
      employmentType: 'full_time',
      hireDate: '2020-01-01',
    });
    const ic = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Robin',
      lastName: 'Park',
      workEmail: 'robin@acme.com',
      jobTitle: 'Engineer',
      employmentType: 'full_time',
      hireDate: '2026-09-01',
      managerId: mgr.id,
    });
    store1.close();

    // --- second "process": reopen the same file, data is still there ---
    const store2 = createSqliteStore(path);
    const svc2 = new DirectoryService({ store: store2 });
    const reloaded = svc2.getEmployee(ic.id);
    assert.equal(reloaded.workEmail, 'robin@acme.com');
    assert.equal(reloaded.managerId, mgr.id);
    assert.deepEqual(
      svc2.reportingChain(ic.id).map((e) => e.id),
      [mgr.id],
    );
    // Invariants still hold against persisted data (unique email).
    assert.throws(() =>
      svc2.createEmployee({
        companyId: company.id,
        firstName: 'X',
        lastName: 'Y',
        workEmail: 'robin@acme.com',
        jobTitle: 'Eng',
        employmentType: 'full_time',
        hireDate: '2026-01-01',
      }),
    );
    store2.close();
  } finally {
    cleanup();
  }
});
