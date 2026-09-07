import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OffboardingService } from '../service/offboardingService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'offboarding-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists an offboarding case across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new OffboardingService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const employee = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      email: 'jordan@acme.com',
    });
    const c = svc1.createCase({
      companyId: company.id,
      employeeId: employee.id,
      reason: 'layoff',
      lastDay: '2026-09-30',
      tasks: ['return_equipment', 'revoke_access'],
    });
    svc1.completeTask(c.id, 'return_equipment', { by: 'it@acme' });
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new OffboardingService({ store: store2 });
    const reloaded = svc2.getCase(c.id);
    assert.equal(reloaded.status, 'in_progress');
    assert.equal(reloaded.tasks.find((t) => t.type === 'return_equipment')?.status, 'done');
    store2.close();
  } finally {
    cleanup();
  }
});
