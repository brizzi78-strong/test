/**
 * Task transitions and case-status derivation. A case's status is always
 * derived from its tasks (never set directly, except the terminal `cancelled`),
 * so the checklist and the headline status can't disagree.
 */

import type { CaseStatus, OffboardingTask, TaskStatus } from './types.ts';

const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  // A pending task can be completed or waived; both are terminal for the task.
  pending: ['done', 'na'],
  done: [],
  na: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

/** True once every task is resolved (done or N/A). */
export function allTasksResolved(tasks: readonly OffboardingTask[]): boolean {
  return tasks.length > 0 && tasks.every((t) => t.status === 'done' || t.status === 'na');
}

/**
 * Derive case status from its tasks:
 *   - every task resolved            -> completed
 *   - no task touched yet            -> not_started
 *   - otherwise                      -> in_progress
 *
 * `cancelled` is set explicitly by the service and never produced here.
 */
export function deriveStatus(tasks: readonly OffboardingTask[]): CaseStatus {
  if (allTasksResolved(tasks)) return 'completed';
  const anyTouched = tasks.some((t) => t.status !== 'pending');
  return anyTouched ? 'in_progress' : 'not_started';
}
