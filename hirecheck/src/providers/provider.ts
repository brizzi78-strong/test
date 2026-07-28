/**
 * Screening-provider abstraction.
 *
 * This service does not itself gather background data. It orchestrates the
 * hiring workflow and delegates the actual lookups to a Consumer Reporting
 * Agency (CRA) behind this interface. A real deployment would implement it
 * against a vendor such as Checkr, HireRight, or Sterling; tests and demos use
 * the deterministic MockProvider in ./mockProvider.ts.
 */

import type { CheckRecord, CheckStatus, CheckType } from '../domain/types.ts';

/** Minimal candidate identity a provider needs to run a check. */
export interface ProviderSubject {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProviderCheckOutcome {
  status: Extract<CheckStatus, 'clear' | 'consider' | 'error'>;
  records: CheckRecord[];
}

export interface ScreeningProvider {
  /** Human-readable provider name, surfaced in logs/audit. */
  readonly name: string;
  /** Run a single check for a subject and return its outcome. */
  runCheck(type: CheckType, subject: ProviderSubject): Promise<ProviderCheckOutcome>;
}
