/**
 * TrainingService — orchestration for the online training portal.
 *
 * Responsibilities:
 *   - manage companies, learners, and a customizable course catalog
 *   - enroll learners and track lesson completion
 *   - score assessments and derive completion, keeping an append-only history
 *
 * The clock and id generator are injected so the lifecycle is deterministic
 * under test.
 */

import { randomUUID } from 'node:crypto';
import type {
  Company,
  Course,
  Enrollment,
  EnrollmentEvent,
  EnrollmentStatus,
  Learner,
} from '../domain/types.ts';
import { allLessonsComplete, deriveStatus, hasAssessment } from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class TrainingService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies / learners ---------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  createLearner(input: {
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Learner {
    this.requireCompany(input.companyId);
    const email = requireString(input.email, 'email');
    if (!EMAIL_RE.test(email)) {
      throw new ValidationError(`email is not a valid address: ${email}`);
    }
    const learner: Learner = {
      id: this.newId('lrn'),
      companyId: input.companyId,
      firstName: requireString(input.firstName, 'firstName'),
      lastName: requireString(input.lastName, 'lastName'),
      email,
      createdAt: this.timestamp(),
    };
    this.store.learners.put(learner);
    return learner;
  }

  // --- Courses -----------------------------------------------------------

  createCourse(input: {
    companyId: string;
    title: string;
    lessons: string[];
    description?: string;
    passingScore?: number;
  }): Course {
    this.requireCompany(input.companyId);
    const lessons = this.validateLessons(input.lessons);
    if (input.passingScore !== undefined) {
      assertScore(input.passingScore, 'passingScore');
    }
    const course: Course = {
      id: this.newId('crs'),
      companyId: input.companyId,
      title: requireString(input.title, 'title'),
      description: input.description,
      lessons,
      passingScore: input.passingScore,
      createdAt: this.timestamp(),
    };
    this.store.courses.put(course);
    return course;
  }

  getCourse(id: string): Course {
    return this.require(this.store.courses, 'Course', id);
  }

  listCourses(filter?: { companyId?: string }): Course[] {
    return this.store.courses.list((c) => !filter?.companyId || c.companyId === filter.companyId);
  }

  // --- Enrollments -------------------------------------------------------

  enroll(input: { companyId: string; courseId: string; learnerId: string }): Enrollment {
    const company = this.requireCompany(input.companyId);
    const course = this.getCourse(input.courseId);
    const learner = this.require(this.store.learners, 'Learner', input.learnerId);
    if (course.companyId !== company.id) {
      throw new ValidationError('course does not belong to company');
    }
    if (learner.companyId !== company.id) {
      throw new ValidationError('learner does not belong to company');
    }

    const ts = this.timestamp();
    const enrollment: Enrollment = {
      id: this.newId('enr'),
      companyId: company.id,
      courseId: course.id,
      learnerId: learner.id,
      status: 'not_started',
      lessonsCompleted: [],
      history: [{ at: ts, event: 'enrolled' }],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.enrollments.put(enrollment);
    return enrollment;
  }

  getEnrollment(id: string): Enrollment {
    return this.require(this.store.enrollments, 'Enrollment', id);
  }

  listEnrollments(filter?: {
    companyId?: string;
    courseId?: string;
    learnerId?: string;
    status?: EnrollmentStatus;
  }): Enrollment[] {
    return this.store.enrollments.list((e) => {
      if (filter?.companyId && e.companyId !== filter.companyId) return false;
      if (filter?.courseId && e.courseId !== filter.courseId) return false;
      if (filter?.learnerId && e.learnerId !== filter.learnerId) return false;
      if (filter?.status && e.status !== filter.status) return false;
      return true;
    });
  }

  /** Mark one lesson complete for an enrollment. */
  completeLesson(enrollmentId: string, lesson: string): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    const course = this.getCourse(enrollment.courseId);

    if (enrollment.status === 'completed') {
      throw new ConflictError('enrollment is already completed');
    }
    if (!course.lessons.includes(lesson)) {
      throw new ValidationError(`lesson is not part of the course: ${lesson}`);
    }
    if (enrollment.lessonsCompleted.includes(lesson)) {
      throw new ConflictError(`lesson already completed: ${lesson}`);
    }

    if (!enrollment.startedAt) enrollment.startedAt = this.timestamp();
    enrollment.lessonsCompleted.push(lesson);
    this.record(enrollment, { event: 'lesson.completed', lesson });
    this.recomputeStatus(enrollment, course);
    return this.save(enrollment);
  }

  /** Submit an assessment score for a course that requires one. */
  submitAssessment(enrollmentId: string, score: number): Enrollment {
    const enrollment = this.getEnrollment(enrollmentId);
    const course = this.getCourse(enrollment.courseId);

    if (!hasAssessment(course)) {
      throw new ValidationError('course has no assessment');
    }
    if (enrollment.status === 'completed') {
      throw new ConflictError('enrollment is already completed');
    }
    if (!allLessonsComplete(course, enrollment.lessonsCompleted)) {
      throw new ConflictError('complete all lessons before submitting the assessment');
    }
    assertScore(score, 'score');

    enrollment.score = score;
    this.record(enrollment, { event: 'assessment.submitted', score });
    this.recomputeStatus(enrollment, course);
    return this.save(enrollment);
  }

  // --- internals ---------------------------------------------------------

  private recomputeStatus(enrollment: Enrollment, course: Course): void {
    enrollment.status = deriveStatus(course, enrollment.lessonsCompleted, enrollment.score);
    enrollment.completedAt = enrollment.status === 'completed' ? this.timestamp() : undefined;
  }

  private record(enrollment: Enrollment, meta: Omit<EnrollmentEvent, 'at'>): void {
    enrollment.history.push({ at: this.timestamp(), ...meta });
  }

  private save(enrollment: Enrollment): Enrollment {
    enrollment.updatedAt = this.timestamp();
    this.store.enrollments.put(enrollment);
    return enrollment;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError(`${what} id is required`);
    }
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }

  private validateLessons(lessons: string[]): string[] {
    if (!Array.isArray(lessons) || lessons.length === 0) {
      throw new ValidationError('lessons must be a non-empty array');
    }
    const seen = new Set<string>();
    for (const l of lessons) {
      const lesson = requireString(l, 'lesson');
      if (seen.has(lesson)) throw new ValidationError(`duplicate lesson: ${lesson}`);
      seen.add(lesson);
    }
    return [...seen];
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function assertScore(value: number, field: string): void {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 100) {
    throw new ValidationError(`${field} must be a number between 0 and 100`);
  }
}
