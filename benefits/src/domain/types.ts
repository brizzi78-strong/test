/**
 * Core domain types for the Benefits module — benefits election / enrollment.
 *
 * The last step of onboarding: a new hire chooses their benefits. A company
 * offers benefit plans (medical, dental, 401k, …), each with coverage tiers and
 * a monthly cost; the employee elects a plan + tier per benefit type (or waives
 * it), lists dependents, and submits. Like its siblings, state is explicit and
 * every change is on an append-only history.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type BenefitType =
  | 'medical'
  | 'dental'
  | 'vision'
  | 'life'
  | 'disability'
  | 'retirement_401k'
  | 'hsa'
  | 'fsa';

export const BENEFIT_TYPES: readonly BenefitType[] = [
  'medical',
  'dental',
  'vision',
  'life',
  'disability',
  'retirement_401k',
  'hsa',
  'fsa',
];

/** Who a plan election covers. */
export type CoverageTier = 'employee' | 'employee_spouse' | 'employee_children' | 'family';

export const COVERAGE_TIERS: readonly CoverageTier[] = [
  'employee',
  'employee_spouse',
  'employee_children',
  'family',
];

export type DependentRelationship = 'spouse' | 'domestic_partner' | 'child' | 'other';

export interface PlanTier {
  tier: CoverageTier;
  /** Employee's monthly premium for this tier, in whole cents. */
  monthlyCostCents: number;
}

export interface BenefitPlan {
  id: string;
  companyId: string;
  type: BenefitType;
  name: string;
  carrier?: string;
  tiers: PlanTier[];
  createdAt: string;
}

export interface Dependent {
  id: string;
  name: string;
  relationship: DependentRelationship;
  dateOfBirth?: string;
}

/**
 * One decision for a benefit type: either an elected plan + tier, or a waiver.
 * `dependentIds` links covered dependents (must exist on the enrollment).
 */
export interface Election {
  type: BenefitType;
  waived: boolean;
  planId?: string;
  tier?: CoverageTier;
  dependentIds?: string[];
}

/**
 * Lifecycle of an enrollment:
 * - `not_started` – created, no decisions yet
 * - `in_progress` – at least one election/waiver recorded
 * - `submitted`   – employee submitted their choices; awaiting confirmation
 * - `confirmed`   – benefits administrator confirmed (terminal)
 */
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'submitted' | 'confirmed';

export interface EnrollmentEvent {
  at: string;
  /** e.g. 'started', 'elected', 'waived', 'dependent.added', 'submitted', 'confirmed'. */
  event: string;
  type?: BenefitType;
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

export interface Enrollment {
  id: string;
  companyId: string;
  employeeId: string;
  status: EnrollmentStatus;
  elections: Election[];
  dependents: Dependent[];
  submittedAt?: string;
  confirmedAt?: string;
  history: EnrollmentEvent[];
  createdAt: string;
  updatedAt: string;
}
