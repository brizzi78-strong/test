import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { TrainingService } from '../service/trainingService.ts';
import { createSqliteStore } from '../store/sqliteStore.ts';

function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'training-sqlite-'));
  return { path: join(dir, 'data.db'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('SQLite store persists an enrollment across a restart', () => {
  const { path, cleanup } = tempDbPath();
  try {
    const store1 = createSqliteStore(path);
    const svc1 = new TrainingService({ store: store1 });
    const company = svc1.createCompany({ name: 'Acme' });
    const learner = svc1.createLearner({
      companyId: company.id,
      firstName: 'Jordan',
      lastName: 'Rivera',
      email: 'jordan@acme.com',
    });
    const course = svc1.createCourse({ companyId: company.id, title: 'Safety', lessons: ['intro', 'quiz'] });
    const enrollment = svc1.enroll({ companyId: company.id, courseId: course.id, learnerId: learner.id });
    svc1.completeLesson(enrollment.id, 'intro');
    store1.close();

    const store2 = createSqliteStore(path);
    const svc2 = new TrainingService({ store: store2 });
    const reloaded = svc2.getEnrollment(enrollment.id);
    assert.equal(reloaded.status, 'in_progress');
    assert.deepEqual(reloaded.lessonsCompleted, ['intro']);
    store2.close();
  } finally {
    cleanup();
  }
});
