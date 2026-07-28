/**
 * Enrollment status transitions and cost computation.
 *
 * Status is advanced explicitly by the service (start → elect → submit →
 * confirm); this module holds the allowed-transition table and the pure
 * premium-total calculation so both live in one place.
 */

import type {
  BenefitPlan,
  Election,
  EnrollmentStatus,
} from './types.ts';

const TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
  not_started: ['in_progress'],
  // Employees can keep editing until they submit.
  in_progress: ['submitted'],
  // A submitted enrollment can be confirmed, or reopened for edits.
  submitted: ['confirmed', 'in_progress'],
  confirmed: [],
};

export function canTransition(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: EnrollmentStatus): boolean {
  return status === 'confirmed';
}

/**
 * Total monthly employee premium across all elected (non-waived) benefits, in
 * cents. Looks up each election's tier cost on its plan; a waiver or a missing
 * plan/tier contributes nothing.
 */
export function totalMonthlyCostCents(
  elections: readonly Election[],
  plans: ReadonlyMap<string, BenefitPlan>,
): number {
  let total = 0;
  for (const election of elections) {
    if (election.waived || !election.planId || !election.tier) continue;
    const plan = plans.get(election.planId);
    if (!plan) continue;
    const tier = plan.tiers.find((t) => t.tier === election.tier);
    if (tier) total += tier.monthlyCostCents;
  }
  return total;
}
