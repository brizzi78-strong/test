import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ScreeningService } from '../service/screeningService.ts';
import { MockProvider } from '../providers/mockProvider.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'hirecheck-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists a screening order across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new ScreeningService({ store: store1, provider: new MockProvider() });
    const company = svc1.createCompany({ name: 'Acme' });
    const candidate = svc1.createCandidate({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      email: 'jordan@acme.com',
      position: 'Engineer',
    });
    const pkg = svc1.createPackage({ companyId: company.id, name: 'Std', checkTypes: ['ssn_trace'] });
    const order = svc1.createOrder({ companyId: company.id, candidateId: candidate.id, packageId: pkg.id });
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new ScreeningService({ store: store2, provider: new MockProvider() });
    const reloaded = svc2.getOrder(order.id);
    assert.equal(reloaded.status, 'created');
    assert.equal(reloaded.candidateId, candidate.id);
    store2.close();
  } finally {
    cleanup();
  }
});
