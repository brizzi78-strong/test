/**
 * Appointment state machine and scheduling helpers — pure functions, no I/O.
 */

import type { Appointment, AppointmentStatus } from './types.ts';

const ALLOWED: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** An appointment still occupies a worker's time only while it can happen. */
export function occupiesTime(status: AppointmentStatus): boolean {
  return status === 'requested' || status === 'confirmed';
}

/** True when two [start,end) instant ranges overlap (touching endpoints don't). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** End instant for an appointment starting at `start` lasting `minutes`. */
export function endInstant(start: string, minutes: number): string {
  return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
}

/** Does `candidate` clash with any of `existing` for the same worker? */
export function hasConflict(candidate: Appointment, existing: Appointment[]): boolean {
  return existing.some(
    (a) =>
      a.id !== candidate.id &&
      a.workerId === candidate.workerId &&
      occupiesTime(a.status) &&
      rangesOverlap(candidate.start, candidate.end, a.start, a.end),
  );
}
