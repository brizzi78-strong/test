/**
 * Domain model for AidFinder: the student profile, the catalog of free-money
 * opportunities (grants, scholarships, tax credits, employer benefits), and
 * tracked applications.
 */

export const DEGREE_LEVELS = ['high-school-senior', 'undergraduate', 'graduate'] as const;
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

export const FIELDS_OF_STUDY = [
  'undecided',
  'stem',
  'business',
  'education',
  'health',
  'arts-humanities',
  'trades',
] as const;
export type FieldOfStudy = (typeof FIELDS_OF_STUDY)[number];

export interface StudentProfile {
  ownerId: string;
  /** 2-letter state of residence, e.g. "NC". */
  state: string;
  degreeLevel: DegreeLevel;
  fieldOfStudy: FieldOfStudy;
  /** Unweighted 4.0-scale GPA; null when unknown/not applicable. */
  gpa: number | null;
  /** Annual household income in dollars (parents' for dependents). */
  householdIncome: number;
  /** People in the household, including the student. */
  householdSize: number;
  /** Will be enrolled at least half-time. */
  enrolledHalfTimePlus: boolean;
  /** US citizen or FAFSA-eligible noncitizen. */
  usCitizenOrEligibleNoncitizen: boolean;
  firstGeneration: boolean;
  communityService: boolean;
  militaryAffiliation: boolean;
  /** Student (or the person paying) has a W-2 employer. */
  employed: boolean;
  updatedAt: string;
}

export const OPPORTUNITY_KINDS = [
  'federal-grant',
  'state-grant',
  'scholarship',
  'tax-credit',
  'employer-benefit',
  'military-benefit',
] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

/** A recurring annual deadline (month/day), or applications taken year-round. */
export type Deadline = { month: number; day: number } | 'rolling';

export interface EligibilityCriteria {
  /** Omit = any degree level. */
  degreeLevels?: DegreeLevel[];
  /** Omit = any field. */
  fields?: FieldOfStudy[];
  /** Omit = nationwide. */
  states?: string[];
  minGpa?: number;
  /** Rough need cutoff; omit = not need-based. */
  maxHouseholdIncome?: number;
  requiresCitizenOrEligibleNoncitizen?: boolean;
  requiresHalfTimePlus?: boolean;
  requiresCommunityService?: boolean;
  requiresMilitaryAffiliation?: boolean;
  requiresEmployment?: boolean;
}

export interface Opportunity {
  /** Stable slug id, e.g. "pell-grant". */
  id: string;
  name: string;
  sponsor: string;
  kind: OpportunityKind;
  /** Typical annual award range in dollars (verify at the source — changes yearly). */
  amountMin: number;
  amountMax: number;
  renewable: boolean;
  deadline: Deadline;
  url: string;
  criteria: EligibilityCriteria;
  /** One-line human note: what it is and the catch, if any. */
  notes: string;
}

export interface Match {
  opportunity: Opportunity;
  /** Why this matched, in plain language. */
  whyMatched: string[];
  /** Best-guess annual amount for this student, in dollars. */
  estimatedAmount: number;
  /** ISO date of the next deadline, or null for rolling. */
  nextDeadline: string | null;
  /** Days from "today" to the next deadline; null for rolling. */
  daysLeft: number | null;
}

export const APPLICATION_STATUSES = [
  'planned',
  'in-progress',
  'submitted',
  'won',
  'declined',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: string;
  ownerId: string;
  opportunityId: string;
  status: ApplicationStatus;
  /** Dollars actually awarded; only meaningful once status is "won". */
  amountWon: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}
