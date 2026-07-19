/**
 * Core domain types for the new-hire background screening service.
 *
 * This service coordinates pre-employment background checks that an employer
 * runs on a candidate. In the United States such checks are "consumer reports"
 * governed by the Fair Credit Reporting Act (FCRA), which is why the model
 * carries explicit disclosure/authorization and adverse-action state rather
 * than treating a screening as a single opaque flag. See ../../README.md.
 *
 * The types use string-literal unions (not TS enums) so the source runs
 * directly under Node's type stripping with no build step.
 */

/** A single background check that can be included in a screening package. */
export type CheckType =
  | 'ssn_trace'
  | 'sex_offender_registry'
  | 'global_watchlist'
  | 'national_criminal'
  | 'county_criminal'
  | 'employment_verification'
  | 'education_verification'
  | 'motor_vehicle_record'
  | 'drug_screen'
  | 'identity_verification';

export const CHECK_TYPES: readonly CheckType[] = [
  'ssn_trace',
  'sex_offender_registry',
  'global_watchlist',
  'national_criminal',
  'county_criminal',
  'employment_verification',
  'education_verification',
  'motor_vehicle_record',
  'drug_screen',
  'identity_verification',
];

/**
 * Outcome of an individual check.
 * - `pending`     – queued, not yet started by the provider
 * - `in_progress` – provider is working the check
 * - `clear`       – completed, nothing adverse found
 * - `consider`    – completed, records found that a human must adjudicate
 * - `error`       – provider could not complete the check
 */
export type CheckStatus = 'pending' | 'in_progress' | 'clear' | 'consider' | 'error';

/** A finding returned by a provider for a check (e.g. one criminal record). */
export interface CheckRecord {
  summary: string;
  /** Provider-specific detail; opaque to this service. */
  detail?: Record<string, unknown>;
}

export interface CheckResult {
  type: CheckType;
  status: CheckStatus;
  records: CheckRecord[];
  completedAt?: string;
}

/**
 * Lifecycle of a screening order. Transitions are enforced centrally in
 * ./workflow.ts; the FCRA-relevant gates are:
 *   - checks may not run until the candidate has authorized (`authorized`)
 *   - an adverse decision must pass through `pre_adverse_action` and a
 *     waiting period before `adverse_action`.
 *
 * - `created`             – order exists, awaiting candidate authorization
 * - `authorized`          – candidate gave FCRA disclosure + authorization
 * - `in_progress`         – provider is running the package's checks
 * - `completed`           – all checks returned; ready for adjudication
 * - `clear`               – adjudicated engageable (terminal, positive)
 * - `pre_adverse_action`  – pre-adverse notice sent; dispute window open
 * - `adverse_action`      – final adverse decision (terminal, negative)
 * - `canceled`            – withdrawn before completion (terminal)
 */
export type OrderStatus =
  | 'created'
  | 'authorized'
  | 'in_progress'
  | 'completed'
  | 'clear'
  | 'pre_adverse_action'
  | 'adverse_action'
  | 'canceled';

export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  'clear',
  'adverse_action',
  'canceled',
];

/**
 * Candidate's FCRA authorization. Recording this is a precondition for running
 * any check. `disclosureVersion` pins which disclosure text the candidate saw.
 */
export interface Authorization {
  authorizedAt: string;
  /** How consent was captured, e.g. 'e_signature', 'wet_signature'. */
  method: string;
  disclosureVersion: string;
  /** Optional audit context. */
  ipAddress?: string;
}

export type AdjudicationDecision = 'clear' | 'adverse';

export interface Adjudication {
  decision: AdjudicationDecision;
  adjudicatedBy: string;
  adjudicatedAt: string;
  notes?: string;
}

/**
 * Adverse-action record. FCRA §615 requires a pre-adverse notice, a reasonable
 * waiting period (commonly at least 5 business days) so the candidate can
 * dispute, and then a final adverse notice.
 */
export interface AdverseAction {
  preAdverseAt: string;
  /** Earliest time the final adverse action may be taken. */
  earliestFinalAt: string;
  adverseAt?: string;
  reason?: string;
}

/** An audit-log entry recording every status transition on an order. */
export interface TransitionEvent {
  at: string;
  from: OrderStatus;
  to: OrderStatus;
  by?: string;
  note?: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Position the candidate is being considered for. */
  position: string;
  createdAt: string;
}

/** A reusable, company-defined bundle of checks (e.g. "Standard", "Driver"). */
export interface ScreeningPackage {
  id: string;
  companyId: string;
  name: string;
  checkTypes: CheckType[];
  createdAt: string;
}

export interface ScreeningOrder {
  id: string;
  companyId: string;
  candidateId: string;
  packageId: string;
  status: OrderStatus;
  authorization?: Authorization;
  checks: CheckResult[];
  adjudication?: Adjudication;
  adverseAction?: AdverseAction;
  history: TransitionEvent[];
  createdAt: string;
  updatedAt: string;
}
