/**
 * State machines for requisitions and applications. Keeping the allowed
 * transitions in one place means the pipeline rules (you can't un-reject, you
 * can't skip straight from applied to hired, etc.) live in exactly one spot.
 */

import type { ApplicationStage, RequisitionStatus } from './types.ts';
import { APPLICATION_TERMINAL, REQUISITION_TERMINAL } from './types.ts';

/** Allowed requisition status transitions. */
const REQUISITION_TRANSITIONS: Record<RequisitionStatus, readonly RequisitionStatus[]> = {
  open: ['on_hold', 'filled', 'closed'],
  on_hold: ['open', 'filled', 'closed'],
  filled: [],
  closed: [],
};

export function canTransitionRequisition(from: RequisitionStatus, to: RequisitionStatus): boolean {
  return REQUISITION_TRANSITIONS[from].includes(to);
}

export function isRequisitionTerminal(status: RequisitionStatus): boolean {
  return REQUISITION_TERMINAL.includes(status);
}

/**
 * Allowed application stage transitions. Each active stage can advance one step,
 * or exit to `rejected` / `withdrawn` at any point.
 */
const APPLICATION_TRANSITIONS: Record<ApplicationStage, readonly ApplicationStage[]> = {
  applied: ['screening', 'rejected', 'withdrawn'],
  screening: ['interview', 'rejected', 'withdrawn'],
  interview: ['offer', 'rejected', 'withdrawn'],
  offer: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export function canTransitionApplication(from: ApplicationStage, to: ApplicationStage): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}

export function isApplicationTerminal(stage: ApplicationStage): boolean {
  return APPLICATION_TERMINAL.includes(stage);
}

/** Every stage reachable in one step (for API discoverability). */
export function nextApplicationStages(from: ApplicationStage): readonly ApplicationStage[] {
  return APPLICATION_TRANSITIONS[from];
}
