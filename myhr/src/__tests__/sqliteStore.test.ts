import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OnboardingService } from '../service/onboardingService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'myhr-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists an onboarding packet across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new OnboardingService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const employee = svc1.createEmployee({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      email: 'jordan@acme.com',
      position: 'Engineer',
      startDate: '2026-08-01',
    });
    const template = svc1.createTemplate({ companyId: company.id, name: 'FT', items: ['i9'] });
    const packet = svc1.createPacket({
      companyId: company.id,
      employeeId: employee.id,
      templateId: template.id,
    });
    svc1.submitItem(packet.id, 'i9', { signature: { name: 'Jordan Rivera' } });
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new OnboardingService({ store: store2 });
    const reloaded = svc2.getPacket(packet.id);
    assert.equal(reloaded.status, 'submitted');
    assert.equal(reloaded.items.find((i) => i.type === 'i9')?.status, 'submitted');
    store2.close();
  } finally {
    cleanup();
  }
});
