/**
 * Core domain types for MyHR — the new-hire paperwork module.
 *
 * MyHR is where a newly hired employee completes and e-signs their onboarding
 * forms and HR reviews them. It is a sibling to the HireCheck screening service
 * (the background-check consent form lives here) and follows the same shape:
 * explicit state machines and an append-only audit trail rather than opaque
 * flags.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

/** A single piece of new-hire paperwork that can be assigned in a packet. */
export type PaperworkType =
  | 'i9' // Employment Eligibility Verification
  | 'w4' // Federal Tax Withholding
  | 'state_tax' // State Tax Withholding
  | 'direct_deposit'
  | 'emergency_contact'
  | 'handbook_acknowledgment'
  | 'code_of_conduct'
  | 'benefits_enrollment'
  | 'background_check_consent';

export const PAPERWORK_TYPES: readonly PaperworkType[] = [
  'i9',
  'w4',
  'state_tax',
  'direct_deposit',
  'emergency_contact',
  'handbook_acknowledgment',
  'code_of_conduct',
  'benefits_enrollment',
  'background_check_consent',
];

/**
 * Forms that legally or practically require the employee's signature to be
 * valid. Submitting one of these without a signature is rejected by the
 * service. Data-only forms (direct deposit, emergency contact, benefits) can be
 * submitted with just their field data.
 */
export const REQUIRES_SIGNATURE: readonly PaperworkType[] = [
  'i9',
  'w4',
  'state_tax',
  'handbook_acknowledgment',
  'code_of_conduct',
  'background_check_consent',
];

/**
 * Lifecycle of one paperwork item.
 * - `assigned`  – part of the packet, employee has not submitted it
 * - `submitted` – employee completed/signed it; awaiting HR review
 * - `approved`  – HR accepted it (terminal, positive)
 * - `returned`  – HR sent it back for correction; employee must resubmit
 */
export type ItemStatus = 'assigned' | 'submitted' | 'approved' | 'returned';

/** A typed, timestamped e-signature captured on a form. */
export interface Signature {
  /** The name the employee typed to sign. */
  name: string;
  signedAt: string;
  ipAddress?: string;
}

export interface PaperworkItem {
  type: PaperworkType;
  status: ItemStatus;
  /** Filled form fields; shape is form-specific and opaque to this service. */
  data?: Record<string, unknown>;
  signature?: Signature;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Reason supplied when HR returns an item for correction. */
  returnNote?: string;
}

/**
 * Derived status of the whole packet.
 * - `not_started` – nothing submitted yet
 * - `in_progress` – some but not all items submitted (or some returned)
 * - `submitted`   – every item submitted; awaiting/undergoing HR review
 * - `complete`    – every item approved (terminal)
 * - `canceled`    – packet withdrawn (terminal)
 */
export type PacketStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'complete'
  | 'canceled';

export interface TransitionEvent {
  at: string;
  /** e.g. 'item.submitted', 'item.approved', 'item.returned', 'packet.canceled'. */
  event: string;
  /** The paperwork item this event concerns, if any. */
  itemType?: PaperworkType;
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
  position: string;
  /** ISO date (YYYY-MM-DD) the employee starts. */
  startDate: string;
  createdAt: string;
}

/** A reusable, company-defined set of forms (e.g. "Full-time", "Contractor"). */
export interface PacketTemplate {
  id: string;
  companyId: string;
  name: string;
  items: PaperworkType[];
  createdAt: string;
}

export interface OnboardingPacket {
  id: string;
  companyId: string;
  employeeId: string;
  templateId: string;
  status: PacketStatus;
  items: PaperworkItem[];
  history: TransitionEvent[];
  createdAt: string;
  updatedAt: string;
}
