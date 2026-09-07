/**
 * Core domain types for Booking — appointments for a service business.
 *
 * A company offers Services (each with a duration), employs Workers, and books
 * Appointments that place a worker at a client for a service at a time. An
 * appointment's status moves through a small, enforced state machine; a
 * confirmed appointment occupies its worker for [start, end), which is how
 * double-booking is prevented.
 */

/** Lifecycle of an appointment (transitions enforced in ./workflow.ts). */
export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'requested',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
];

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

/** A service on the menu (e.g. "60-min massage", "standard clean"). */
export interface Service {
  id: string;
  companyId: string;
  name: string;
  durationMinutes: number;
  priceCents?: number;
  createdAt: string;
}

/**
 * A person who performs appointments (e.g. a massage therapist), plus the
 * credentials collected when vetting them. Identity documents are sensitive: a
 * production build stores a reference to a securely-held file, not the raw
 * number — here `licenseNumber` is masked in listings (see the service).
 */
export interface Worker {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  /** Driver's-license / state-ID for identity vetting (sensitive PII). */
  licenseState?: string;
  licenseNumber?: string;
  /** LinkedIn (or other professional) profile URL. */
  linkedinUrl?: string;
  createdAt: string;
}

/** Status of an employment reference being run for a worker. */
export type ReferenceStatus = 'requested' | 'received' | 'declined';

export const REFERENCE_STATUSES: readonly ReferenceStatus[] = ['requested', 'received', 'declined'];

/**
 * An employment reference for a worker — captured when vetting a new therapist.
 * The referee is contacted out-of-band; this records who they are and what came
 * back, with consent captured before contacting them.
 */
export interface Reference {
  id: string;
  companyId: string;
  workerId: string;
  refereeName: string;
  relationship: string;
  phone?: string;
  email?: string;
  status: ReferenceStatus;
  /** 1–5 recommendation strength, set when a reference is received. */
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** One appended history entry, so an appointment's timeline is auditable. */
export interface AppointmentEvent {
  at: string;
  event: string;
  by?: string;
  note?: string;
}

export interface Appointment {
  id: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  clientName: string;
  clientPhone?: string;
  address?: string;
  /** ISO 8601 start instant. */
  start: string;
  /** ISO 8601 end instant, derived from start + durationMinutes. */
  end: string;
  workerId?: string;
  workerName?: string;
  status: AppointmentStatus;
  notes?: string;
  history: AppointmentEvent[];
  createdAt: string;
  updatedAt: string;
}
