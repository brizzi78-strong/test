/**
 * Tax year 2025 federal parameters (post One Big Beautiful Bill Act).
 *
 * Every constant the engine uses lives here so a new tax year is a new
 * parameters file, not an engine change.
 */

import type { FilingStatus } from './types.ts';

export interface Bracket {
  rate: number;
  /** Upper bound of the bracket (taxable income); Infinity for the top. */
  upTo: number;
}

type ByStatus<T> = Record<FilingStatus, T>;

/** Ordinary income brackets (Rev. Proc. 2024-40 as adjusted for 2025). */
export const ORDINARY_BRACKETS: ByStatus<Bracket[]> = {
  single: [
    { rate: 0.1, upTo: 11_925 },
    { rate: 0.12, upTo: 48_475 },
    { rate: 0.22, upTo: 103_350 },
    { rate: 0.24, upTo: 197_300 },
    { rate: 0.32, upTo: 250_525 },
    { rate: 0.35, upTo: 626_350 },
    { rate: 0.37, upTo: Infinity },
  ],
  'married-joint': [
    { rate: 0.1, upTo: 23_850 },
    { rate: 0.12, upTo: 96_950 },
    { rate: 0.22, upTo: 206_700 },
    { rate: 0.24, upTo: 394_600 },
    { rate: 0.32, upTo: 501_050 },
    { rate: 0.35, upTo: 751_600 },
    { rate: 0.37, upTo: Infinity },
  ],
  'married-separate': [
    { rate: 0.1, upTo: 11_925 },
    { rate: 0.12, upTo: 48_475 },
    { rate: 0.22, upTo: 103_350 },
    { rate: 0.24, upTo: 197_300 },
    { rate: 0.32, upTo: 250_525 },
    { rate: 0.35, upTo: 375_800 },
    { rate: 0.37, upTo: Infinity },
  ],
  'head-of-household': [
    { rate: 0.1, upTo: 17_000 },
    { rate: 0.12, upTo: 64_850 },
    { rate: 0.22, upTo: 103_350 },
    { rate: 0.24, upTo: 197_300 },
    { rate: 0.32, upTo: 250_500 },
    { rate: 0.35, upTo: 626_350 },
    { rate: 0.37, upTo: Infinity },
  ],
};

/** Base standard deduction (OBBBA-increased 2025 amounts). */
export const STANDARD_DEDUCTION: ByStatus<number> = {
  single: 15_750,
  'married-joint': 31_500,
  'married-separate': 15_750,
  'head-of-household': 23_625,
};

/** Additional standard deduction per instance of age-65+ or blindness. */
export const ADDITIONAL_STANDARD_DEDUCTION: ByStatus<number> = {
  single: 2_000,
  'married-joint': 1_600,
  'married-separate': 1_600,
  'head-of-household': 2_000,
};

/**
 * 0% and 15% rate ceilings for net long-term capital gains and qualified
 * dividends (taxable income thresholds); gains above the 15% ceiling are 20%.
 */
export const CAPITAL_GAINS_THRESHOLDS: ByStatus<{ zeroUpTo: number; fifteenUpTo: number }> = {
  single: { zeroUpTo: 48_350, fifteenUpTo: 533_400 },
  'married-joint': { zeroUpTo: 96_700, fifteenUpTo: 600_050 },
  'married-separate': { zeroUpTo: 48_350, fifteenUpTo: 300_000 },
  'head-of-household': { zeroUpTo: 64_750, fifteenUpTo: 566_700 },
};

/** Child tax credit (OBBBA: $2,200/qualifying child for 2025). */
export const CHILD_TAX_CREDIT_PER_CHILD = 2_200;
export const OTHER_DEPENDENT_CREDIT = 500;
export const CTC_PHASEOUT_START: ByStatus<number> = {
  single: 200_000,
  'married-joint': 400_000,
  'married-separate': 200_000,
  'head-of-household': 200_000,
};
/** Credit falls $50 per $1,000 (or fraction) of AGI over the threshold. */
export const CTC_PHASEOUT_RATE = 50;
export const CTC_PHASEOUT_STEP = 1_000;
/** A child must be under this age at year-end to qualify for the CTC. */
export const CTC_MAX_CHILD_AGE = 16;

/** Self-employment tax. */
export const SE_NET_EARNINGS_FACTOR = 0.9235;
export const SE_SOCIAL_SECURITY_RATE = 0.124;
export const SE_MEDICARE_RATE = 0.029;
export const SOCIAL_SECURITY_WAGE_BASE = 176_100;
/** No SE tax due when net SE earnings are below this floor. */
export const SE_TAX_FLOOR = 400;

/** Additional Medicare tax (0.9% on earned income over the threshold). */
export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD: ByStatus<number> = {
  single: 200_000,
  'married-joint': 250_000,
  'married-separate': 125_000,
  'head-of-household': 200_000,
};

/** Net investment income tax (3.8% over the MAGI threshold). */
export const NIIT_RATE = 0.038;
export const NIIT_THRESHOLD: ByStatus<number> = {
  single: 200_000,
  'married-joint': 250_000,
  'married-separate': 125_000,
  'head-of-household': 200_000,
};

/** Qualified business income deduction (Section 199A). */
export const QBI_RATE = 0.2;

/** Capital losses offset ordinary income only up to this amount per year. */
export const CAPITAL_LOSS_LIMIT: ByStatus<number> = {
  single: 3_000,
  'married-joint': 3_000,
  'married-separate': 1_500,
  'head-of-household': 3_000,
};

/** SALT deduction cap (OBBBA: $40k for 2025, phased down over $500k MAGI). */
export const SALT_CAP: ByStatus<number> = {
  single: 40_000,
  'married-joint': 40_000,
  'married-separate': 20_000,
  'head-of-household': 40_000,
};
export const SALT_CAP_FLOOR: ByStatus<number> = {
  single: 10_000,
  'married-joint': 10_000,
  'married-separate': 5_000,
  'head-of-household': 10_000,
};
export const SALT_PHASEDOWN_START: ByStatus<number> = {
  single: 500_000,
  'married-joint': 500_000,
  'married-separate': 250_000,
  'head-of-household': 500_000,
};
/** Cap shrinks by 30% of MAGI over the phase-down start, to the floor. */
export const SALT_PHASEDOWN_RATE = 0.3;

/** Medical expenses are deductible only above this fraction of AGI. */
export const MEDICAL_AGI_FLOOR = 0.075;

/** Student loan interest deduction. */
export const STUDENT_LOAN_INTEREST_CAP = 2_500;
export const STUDENT_LOAN_PHASEOUT: ByStatus<{ start: number; end: number } | null> = {
  single: { start: 85_000, end: 100_000 },
  'married-joint': { start: 170_000, end: 200_000 },
  'married-separate': null, // not eligible
  'head-of-household': { start: 85_000, end: 100_000 },
};

/** Simple contribution ceilings enforced at input validation time. */
export const IRA_CONTRIBUTION_LIMIT = 8_000; // $7,000 + $1,000 catch-up
export const HSA_CONTRIBUTION_LIMIT = 9_550; // family + catch-up ceiling
export const EDUCATOR_EXPENSE_LIMIT = 300;
