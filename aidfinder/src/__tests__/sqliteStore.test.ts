import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteStore } from '../store/sqliteStore.ts';
import type { Application, StudentProfile } from '../domain/types.ts';

const dir = mkdtempSync(join(tmpdir(), 'aidfinder-test-'));
const dbPath = join(dir, 'aid.db');

after(() => rmSync(dir, { recursive: true, force: true }));

const profile: StudentProfile = {
  ownerId: 'demo',
  state: 'NC',
  degreeLevel: 'high-school-senior',
  fieldOfStudy: 'stem',
  gpa: 3.6,
  householdIncome: 48000,
  householdSize: 4,
  enrolledHalfTimePlus: true,
  usCitizenOrEligibleNoncitizen: true,
  firstGeneration: true,
  communityService: true,
  militaryAffiliation: false,
  employed: false,
  updatedAt: '2026-08-06T00:00:00.000Z',
};

const application: Application = {
  id: 'app-1',
  ownerId: 'demo',
  opportunityId: 'dell-scholars',
  status: 'planned',
  amountWon: 0,
  note: '',
  createdAt: '2026-08-06T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
};

describe('SQLite store', () => {
  it('round-trips profiles and applications, and upserts on conflict', () => {
    const store = createSqliteStore(dbPath);
    assert.equal(store.getProfile('demo'), undefined);
    store.putProfile(profile);
    assert.deepEqual(store.getProfile('demo'), profile);
    store.putProfile({ ...profile, gpa: 3.8 });
    assert.equal(store.getProfile('demo')?.gpa, 3.8);

    store.putApplication(application);
    assert.deepEqual(store.getApplication('app-1'), application);
    store.putApplication({ ...application, status: 'won', amountWon: 20000 });
    assert.equal(store.getApplication('app-1')?.status, 'won');
    assert.deepEqual(store.listApplications('demo').map((a) => a.id), ['app-1']);
    assert.deepEqual(store.listApplications('someone-else'), []);
    store.close();
  });

  it('persists across reopen — the point of the disk', () => {
    const reopened = createSqliteStore(dbPath);
    assert.equal(reopened.getProfile('demo')?.gpa, 3.8);
    assert.equal(reopened.getApplication('app-1')?.amountWon, 20000);
    reopened.deleteApplication('app-1');
    assert.equal(reopened.getApplication('app-1'), undefined);
    reopened.close();
  });
});
