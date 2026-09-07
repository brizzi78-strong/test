import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { RecruitingService } from '../service/recruitingService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'recruiting-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists an application across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new RecruitingService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const req = svc1.createRequisition({
      companyId: company.id,
      title: 'Engineer',
      department: 'Eng',
      location: 'Remote',
      employmentType: 'full_time',
    });
    const app = svc1.createApplication({
      companyId: company.id,
      requisitionId: req.id,
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin@acme.com',
    });
    svc1.advanceApplication(app.id, { toStage: 'screening' });
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new RecruitingService({ store: store2 });
    const reloaded = svc2.getApplication(app.id);
    assert.equal(reloaded.stage, 'screening');
    assert.equal(reloaded.requisitionId, req.id);
    store2.close();
  } finally {
    cleanup();
  }
});
