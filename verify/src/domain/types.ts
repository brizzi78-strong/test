/**
 * Core domain types for Cardinal Verify — consent-based verification.
 *
 * The legitimate, no-vendor part of background screening: with the candidate's
 * written consent, confirm their **references**, past **employment**, and
 * **education** by asking the source directly. A company opens a *request* for a
 * candidate; the candidate reviews a disclosure and e-signs consent; then each
 * reference / employer / school gets a private link to attest. Nothing is
 * collected before consent, and every step is on an append-only history.
 *
 * This deliberately does NOT touch criminal or credit data — those are consumer
 * reports that require a credentialed CRA. This module handles what consent
 * alone makes lawful.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type ItemType = 'reference' | 'employment' | 'education';

export const ITEM_TYPES: readonly ItemType[] = ['reference', 'employment', 'education'];

export type ItemStatus = 'pending' | 'completed' | 'declined';

/** Lifecycle of a request: consent gates everything after `awaiting_consent`. */
export type RequestStatus = 'awaiting_consent' | 'in_progress' | 'completed' | 'canceled';

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
  createdAt: string;
}

/** The candidate's recorded authorization — the gate for all collection. */
export interface Consent {
  signedName: string;
  signedAt: string;
  disclosureVersion: string;
  ip?: string;
}

/** What a verifier submitted about one item. */
export interface ItemResponse {
  respondedAt: string;
  verifierName: string;
  /** Did the source confirm the relationship / employment / education? */
  confirmed: boolean;
  /** Free-form structured answers (dates, title, would-rehire, comments, …). */
  answers: Record<string, string>;
}

export interface Item {
  id: string;
  type: ItemType;
  /** reference: the reference's name · employment: employer · education: school. */
  subject: string;
  /** reference: relationship · employment: job title · education: credential. */
  detail?: string;
  contactName?: string;
  contactEmail: string;
  /** Opaque per-item link token the verifier uses to attest. */
  token: string;
  status: ItemStatus;
  response?: ItemResponse;
}

export interface RequestEvent {
  at: string;
  /** e.g. 'created', 'consented', 'item.completed', 'item.declined', 'completed', 'canceled'. */
  event: string;
  note?: string;
}

export interface VerificationRequest {
  id: string;
  companyId: string;
  candidateId: string;
  status: RequestStatus;
  /** Opaque token for the candidate's consent page. */
  consentToken: string;
  consent?: Consent;
  items: Item[];
  history: RequestEvent[];
  createdAt: string;
  updatedAt: string;
}
