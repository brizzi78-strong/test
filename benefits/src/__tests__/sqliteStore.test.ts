import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BenefitsService } from '../service/benefitsService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'benefits-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists a benefits enrollment across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new BenefitsService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const employee = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      email: 'jordan@acme.com',
    });
    const plan = svc1.createPlan({
      companyId: company.id,
      type: 'medical',
      name: 'PPO',
      tiers: [{ tier: 'employee', monthlyCostCents: 12000 }],
    });
    const enrollment = svc1.startEnrollment({ companyId: company.id, employeeId: employee.id });
    svc1.elect(enrollment.id, { type: 'medical', planId: plan.id, tier: 'employee' });
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new BenefitsService({ store: store2 });
    const summary = svc2.getSummary(enrollment.id);
    assert.equal(summary.enrollment.status, 'in_progress');
    assert.equal(summary.monthlyCostCents, 12000);
    store2.close();
  } finally {
    cleanup();
  }
});
