/**
 * Tax-year parameter selection. A new tax year is a new taxYearNNNN.ts file
 * plus one entry here — the engine never changes.
 */

import * as Y2025 from './taxYear2025.ts';
import * as Y2026 from './taxYear2026.ts';
import type { Bracket } from './taxYear2025.ts';
import type { FilingStatus } from './types.ts';

type ByStatus<T> = Record<FilingStatus, T>;

/** The full parameter set the engine consumes for one tax year. */
export interface TaxYearParams {
  ORDINARY_BRACKETS: ByStatus<Bracket[]>;
  STANDARD_DEDUCTION: ByStatus<number>;
  ADDITIONAL_STANDARD_DEDUCTION: ByStatus<number>;
  CAPITAL_GAINS_THRESHOLDS: ByStatus<{ zeroUpTo: number; fifteenUpTo: number }>;
  CHILD_TAX_CREDIT_PER_CHILD: number;
  OTHER_DEPENDENT_CREDIT: number;
  CTC_PHASEOUT_START: ByStatus<number>;
  CTC_PHASEOUT_RATE: number;
  CTC_PHASEOUT_STEP: number;
  CTC_MAX_CHILD_AGE: number;
  SE_NET_EARNINGS_FACTOR: number;
  SE_SOCIAL_SECURITY_RATE: number;
  SE_MEDICARE_RATE: number;
  SOCIAL_SECURITY_WAGE_BASE: number;
  SE_TAX_FLOOR: number;
  ADDITIONAL_MEDICARE_RATE: number;
  ADDITIONAL_MEDICARE_THRESHOLD: ByStatus<number>;
  NIIT_RATE: number;
  NIIT_THRESHOLD: ByStatus<number>;
  QBI_RATE: number;
  CAPITAL_LOSS_LIMIT: ByStatus<number>;
  SALT_CAP: ByStatus<number>;
  SALT_CAP_FLOOR: ByStatus<number>;
  SALT_PHASEDOWN_START: ByStatus<number>;
  SALT_PHASEDOWN_RATE: number;
  MEDICAL_AGI_FLOOR: number;
  STUDENT_LOAN_INTEREST_CAP: number;
  STUDENT_LOAN_PHASEOUT: ByStatus<{ start: number; end: number } | null>;
  IRA_CONTRIBUTION_LIMIT: number;
  HSA_CONTRIBUTION_LIMIT: number;
  EDUCATOR_EXPENSE_LIMIT: number;
}

export const SUPPORTED_TAX_YEARS = [2025, 2026] as const;
export type SupportedTaxYear = (typeof SUPPORTED_TAX_YEARS)[number];

const BY_YEAR: Record<SupportedTaxYear, TaxYearParams> = {
  2025: Y2025,
  2026: Y2026,
};

export function isSupportedTaxYear(year: number): year is SupportedTaxYear {
  return (SUPPORTED_TAX_YEARS as readonly number[]).includes(year);
}

export function paramsForYear(year: number): TaxYearParams {
  if (!isSupportedTaxYear(year)) {
    throw new Error(`unsupported tax year ${year}; supported: ${SUPPORTED_TAX_YEARS.join(', ')}`);
  }
  return BY_YEAR[year];
}
