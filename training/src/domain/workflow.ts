/**
 * Enrollment-status derivation. The status is a pure function of the course
 * definition, the lessons completed, and the latest assessment score — so it
 * can never drift from the underlying progress.
 */

import type { Course, EnrollmentStatus } from './types.ts';

/** True once every lesson in the course has been completed. */
export function allLessonsComplete(course: Course, lessonsCompleted: readonly string[]): boolean {
  const done = new Set(lessonsCompleted);
  return course.lessons.length > 0 && course.lessons.every((l) => done.has(l));
}

/** Whether the course requires a passing assessment to complete. */
export function hasAssessment(course: Course): boolean {
  return typeof course.passingScore === 'number';
}

/**
 * Derive enrollment status from progress:
 *   - no lessons done                         -> not_started
 *   - not all lessons done                    -> in_progress
 *   - all done, no assessment required        -> completed
 *   - all done, assessment required:
 *       - no score yet                        -> in_progress (awaiting assessment)
 *       - score >= passing                    -> completed
 *       - score <  passing                    -> failed
 */
export function deriveStatus(
  course: Course,
  lessonsCompleted: readonly string[],
  score: number | undefined,
): EnrollmentStatus {
  if (lessonsCompleted.length === 0) return 'not_started';
  if (!allLessonsComplete(course, lessonsCompleted)) return 'in_progress';

  if (!hasAssessment(course)) return 'completed';
  if (typeof score !== 'number') return 'in_progress';
  return score >= (course.passingScore as number) ? 'completed' : 'failed';
}
