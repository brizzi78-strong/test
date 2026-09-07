/**
 * Core domain types for the Recruiting module — job requisitions and the
 * applicant-tracking pipeline.
 *
 * This is the front of the hiring funnel. When an application reaches the
 * `hired` stage it is the trigger point for the rest of the suite: a HireCheck
 * screening order and a MyHR onboarding packet. Those modules stay decoupled —
 * Recruiting only owns getting a candidate to "hired".
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship',
];

/**
 * Status of a job requisition (the opening itself).
 * - `open`   – accepting applications
 * - `on_hold`– temporarily paused; no new applications
 * - `filled` – a candidate was hired (terminal)
 * - `closed` – cancelled/withdrawn without hiring (terminal)
 */
export type RequisitionStatus = 'open' | 'on_hold' | 'filled' | 'closed';

export const REQUISITION_TERMINAL: readonly RequisitionStatus[] = ['filled', 'closed'];

/**
 * Stage of an application in the hiring pipeline.
 * - `applied`   – submitted, not yet reviewed
 * - `screening` – resume/phone screen
 * - `interview` – interviewing
 * - `offer`     – offer extended
 * - `hired`     – accepted (terminal; triggers screening + onboarding)
 * - `rejected`  – declined by the employer (terminal)
 * - `withdrawn` – candidate withdrew (terminal)
 */
export type ApplicationStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export const APPLICATION_TERMINAL: readonly ApplicationStage[] = ['hired', 'rejected', 'withdrawn'];

/** The ordered "forward" progression a healthy application moves through. */
export const APPLICATION_PIPELINE: readonly ApplicationStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
];

export interface StageEvent {
  at: string;
  from: ApplicationStage;
  to: ApplicationStage;
  by?: string;
  note?: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface JobRequisition {
  id: string;
  companyId: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  status: RequisitionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  companyId: string;
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  stage: ApplicationStage;
  /** Reason captured when rejected or withdrawn. */
  outcomeReason?: string;
  history: StageEvent[];
  createdAt: string;
  updatedAt: string;
}
