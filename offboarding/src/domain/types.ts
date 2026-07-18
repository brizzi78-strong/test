/**
 * Core domain types for the Offboarding module — the mirror of MyHR onboarding.
 *
 * When someone leaves, an offboarding case is opened for them with a separation
 * checklist; each task is completed or marked not-applicable, and the case
 * status is derived from its tasks (so it can't drift). This closes the
 * employee lifecycle: Recruiting hires them, the Directory holds them, and
 * Offboarding separates them.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type SeparationReason =
  | 'voluntary'
  | 'involuntary'
  | 'layoff'
  | 'retirement'
  | 'end_of_contract';

export const SEPARATION_REASONS: readonly SeparationReason[] = [
  'voluntary',
  'involuntary',
  'layoff',
  'retirement',
  'end_of_contract',
];

/** A single item on the separation checklist. */
export type OffboardingTaskType =
  | 'exit_interview'
  | 'return_equipment'
  | 'revoke_access'
  | 'collect_badge'
  | 'final_paycheck'
  | 'cobra_notice'
  | 'benefits_termination'
  | 'knowledge_transfer'
  | 'remove_from_directory';

export const OFFBOARDING_TASK_TYPES: readonly OffboardingTaskType[] = [
  'exit_interview',
  'return_equipment',
  'revoke_access',
  'collect_badge',
  'final_paycheck',
  'cobra_notice',
  'benefits_termination',
  'knowledge_transfer',
  'remove_from_directory',
];

/** The default checklist when a case is created without an explicit task list. */
export const DEFAULT_CHECKLIST: readonly OffboardingTaskType[] = [
  'exit_interview',
  'return_equipment',
  'revoke_access',
  'collect_badge',
  'final_paycheck',
  'cobra_notice',
  'benefits_termination',
  'knowledge_transfer',
  'remove_from_directory',
];

/**
 * Status of a checklist task.
 * - `pending` – not yet handled
 * - `done`    – completed
 * - `na`      – not applicable to this separation
 */
export type TaskStatus = 'pending' | 'done' | 'na';

export interface OffboardingTask {
  type: OffboardingTaskType;
  status: TaskStatus;
  completedBy?: string;
  completedAt?: string;
  note?: string;
}

/**
 * Derived status of the whole case.
 * - `not_started` – no tasks handled yet
 * - `in_progress` – some tasks handled
 * - `completed`   – every task done or marked N/A (terminal)
 * - `cancelled`   – case withdrawn (terminal)
 */
export type CaseStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export interface CaseEvent {
  at: string;
  /** e.g. 'opened', 'task.done', 'task.na', 'cancelled'. */
  event: string;
  taskType?: OffboardingTaskType;
  by?: string;
  note?: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export interface OffboardingCase {
  id: string;
  companyId: string;
  employeeId: string;
  reason: SeparationReason;
  /** ISO date (YYYY-MM-DD) of the employee's last day. */
  lastDay: string;
  status: CaseStatus;
  tasks: OffboardingTask[];
  history: CaseEvent[];
  createdAt: string;
  updatedAt: string;
}
