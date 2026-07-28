/**
 * Core domain types for the Training module — the online training portal.
 *
 * A company defines a catalog of courses (e.g. Sexual Harassment Prevention,
 * Workplace Safety, Code of Conduct — fully customizable), each a list of
 * lessons plus an optional passing assessment. Learners (new hires) are
 * enrolled, complete the lessons, and — if the course has an assessment — must
 * pass it to complete. Enrollment status is always derived from progress, never
 * set directly.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Learner {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

/**
 * A course is an ordered list of lesson keys plus an optional passing score.
 * When `passingScore` is set (0–100), the learner must submit an assessment
 * score at or above it to complete; when it is undefined, finishing every
 * lesson completes the course.
 */
export interface Course {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  lessons: string[];
  passingScore?: number;
  createdAt: string;
}

/**
 * Status of an enrollment, always derived from lesson progress + assessment:
 * - `not_started` – enrolled, no lessons completed
 * - `in_progress` – some lessons done (or all done but assessment not yet passed)
 * - `completed`   – all lessons done and assessment passed / not required (terminal)
 * - `failed`      – all lessons done but the submitted assessment was below the
 *                   passing score (the learner may retake it)
 */
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface EnrollmentEvent {
  at: string;
  /** e.g. 'enrolled', 'lesson.completed', 'assessment.submitted'. */
  event: string;
  lesson?: string;
  score?: number;
  note?: string;
}

export interface Enrollment {
  id: string;
  companyId: string;
  courseId: string;
  learnerId: string;
  status: EnrollmentStatus;
  lessonsCompleted: string[];
  /** Most recent assessment score, if one has been submitted. */
  score?: number;
  startedAt?: string;
  completedAt?: string;
  history: EnrollmentEvent[];
  createdAt: string;
  updatedAt: string;
}
