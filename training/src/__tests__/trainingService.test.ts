import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TrainingService } from '../service/trainingService.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';
import { createInMemoryStore } from '../store/store.ts';

function makeService(start = '2026-07-16T12:00:00.000Z') {
  const clock = { current: new Date(start) };
  let seq = 0;
  const service = new TrainingService({
    store: createInMemoryStore(),
    now: () => new Date(clock.current.getTime()),
    newId: (prefix) => `${prefix}_${++seq}`,
  });
  return { service, clock };
}

/** Seed a company, learner, and course. `passingScore` undefined = no assessment. */
function seed(service: TrainingService, lessons: string[], passingScore?: number) {
  const company = service.createCompany({ name: 'Acme, Inc.' });
  const learner = service.createLearner({
    companyId: company.id,
    firstName: 'Jordan',
    lastName: 'Rivera',
    email: 'jordan.rivera@example.com',
  });
  const course = service.createCourse({
    companyId: company.id,
    title: 'Sexual Harassment Prevention',
    lessons,
    passingScore,
  });
  const enrollment = service.enroll({
    companyId: company.id,
    courseId: course.id,
    learnerId: learner.id,
  });
  return { company, learner, course, enrollment };
}

test('enrollment starts not_started', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro', 'scenarios']);
  assert.equal(enrollment.status, 'not_started');
  assert.equal(enrollment.lessonsCompleted.length, 0);
});

test('completing all lessons (no assessment) completes the course', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro', 'scenarios']);

  const afterOne = service.completeLesson(enrollment.id, 'intro');
  assert.equal(afterOne.status, 'in_progress');
  assert.ok(afterOne.startedAt);

  const done = service.completeLesson(enrollment.id, 'scenarios');
  assert.equal(done.status, 'completed');
  assert.ok(done.completedAt);
});

test('assessment course requires a passing score to complete', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro', 'policy'], 80);

  service.completeLesson(enrollment.id, 'intro');
  const allLessons = service.completeLesson(enrollment.id, 'policy');
  // All lessons done but assessment not yet submitted -> still in progress.
  assert.equal(allLessons.status, 'in_progress');

  const failed = service.submitAssessment(enrollment.id, 70);
  assert.equal(failed.status, 'failed');

  // Learner can retake and pass.
  const passed = service.submitAssessment(enrollment.id, 85);
  assert.equal(passed.status, 'completed');
  assert.equal(passed.score, 85);
});

test('cannot submit an assessment before finishing lessons', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro', 'policy'], 80);
  service.completeLesson(enrollment.id, 'intro');
  assert.throws(() => service.submitAssessment(enrollment.id, 90), ConflictError);
});

test('assessment on a course without one is rejected', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro']);
  service.completeLesson(enrollment.id, 'intro'); // completes the course (no assessment)
  assert.throws(() => service.submitAssessment(enrollment.id, 90), ValidationError);
});

test('cannot complete a lesson not in the course, or complete twice', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro', 'policy']);
  assert.throws(() => service.completeLesson(enrollment.id, 'nope'), ValidationError);
  service.completeLesson(enrollment.id, 'intro');
  assert.throws(() => service.completeLesson(enrollment.id, 'intro'), ConflictError);
});

test('cannot complete lessons after the course is completed', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['only']);
  service.completeLesson(enrollment.id, 'only'); // completed
  assert.throws(() => service.completeLesson(enrollment.id, 'only'), ConflictError);
});

test('history records enrollment, lessons, and assessment in order', () => {
  const { service } = makeService();
  const { enrollment } = seed(service, ['intro'], 80);
  service.completeLesson(enrollment.id, 'intro');
  service.submitAssessment(enrollment.id, 60);
  const done = service.submitAssessment(enrollment.id, 90);
  assert.deepEqual(
    done.history.map((h) => h.event),
    ['enrolled', 'lesson.completed', 'assessment.submitted', 'assessment.submitted'],
  );
});

test('validation: empty lessons, bad passing score, bad email, cross-company', () => {
  const { service } = makeService();
  const company = service.createCompany({ name: 'Acme' });

  assert.throws(() => service.createCourse({ companyId: company.id, title: 'X', lessons: [] }), ValidationError);
  assert.throws(
    () => service.createCourse({ companyId: company.id, title: 'X', lessons: ['a'], passingScore: 150 }),
    ValidationError,
  );
  assert.throws(
    () => service.createLearner({ companyId: company.id, firstName: 'A', lastName: 'B', email: 'nope' }),
    ValidationError,
  );

  const other = service.createCompany({ name: 'Other' });
  const course = service.createCourse({ companyId: company.id, title: 'C', lessons: ['a'] });
  const learner = service.createLearner({
    companyId: other.id,
    firstName: 'C',
    lastName: 'D',
    email: 'c.d@example.com',
  });
  assert.throws(
    () => service.enroll({ companyId: company.id, courseId: course.id, learnerId: learner.id }),
    ValidationError,
  );
});

test('unknown ids raise NotFoundError', () => {
  const { service } = makeService();
  assert.throws(() => service.getEnrollment('enr_missing'), NotFoundError);
});

test('listEnrollments filters by status', () => {
  const { service } = makeService();
  const { company, enrollment } = seed(service, ['only']);
  service.completeLesson(enrollment.id, 'only');
  assert.equal(service.listEnrollments({ companyId: company.id, status: 'completed' }).length, 1);
  assert.equal(service.listEnrollments({ status: 'in_progress' }).length, 0);
});
