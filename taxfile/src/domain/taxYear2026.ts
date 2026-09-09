/**
 * Tax year 2026 federal parameters (Rev. Proc. 2025-32 inflation adjustments
 * plus OBBBA indexing; SSA 2026 wage base).
 *
 * Planning-grade figures for the projection year. A handful of minor items
 * (noted inline) carry forward prior-year values pending final IRS
 * publications — all err conservative, so a 2026 projection never promises
 * more refund than the final numbers would.
 */

import type { FilingStatus } from './types.ts';
import type { Bracket } from './taxYear2025.ts';

type ByStatus<T> = Record<FilingStatus, T>;

export const ORDINARY_BRACKETS: ByStatus<Bracket[]> = {
  single: [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: Infinity },
  ],
  'married-joint': [
    { rate: 0.1, upTo: 24_800 },
    { rate: 0.12, upTo: 100_800 },
    { rate: 0.22, upTo: 211_400 },
    { rate: 0.24, upTo: 403_550 },
    { rate: 0.32, upTo: 512_450 },
    { rate: 0.35, upTo: 768_700 },
    { rate: 0.37, upTo: Infinity },
  ],
  'married-separate': [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 384_350 },
    { rate: 0.37, upTo: Infinity },
  ],
  'head-of-household': [
    { rate: 0.1, upTo: 17_700 },
    { rate: 0.12, upTo: 67_450 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_200 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

export const STANDARD_DEDUCTION: ByStatus<number> = {
  single: 16_100,
  'married-joint': 32_200,
  'married-separate': 16_100,
  'head-of-household': 24_150,
};

export const ADDITIONAL_STANDARD_DEDUCTION: ByStatus<number> = {
  single: 2_050,
  'married-joint': 1_650,
  'married-separate': 1_650,
  'head-of-household': 2_050,
};

export const CAPITAL_GAINS_THRESHOLDS: ByStatus<{ zeroUpTo: number; fifteenUpTo: number }> = {
  single: { zeroUpTo: 49_450, fifteenUpTo: 545_500 },
  'married-joint': { zeroUpTo: 98_900, fifteenUpTo: 613_700 },
  'married-separate': { zeroUpTo: 49_450, fifteenUpTo: 306_850 },
  'head-of-household': { zeroUpTo: 66_200, fifteenUpTo: 579_600 },
};

export const CHILD_TAX_CREDIT_PER_CHILD = 2_200;
export const OTHER_DEPENDENT_CREDIT = 500;
export const CTC_PHASEOUT_START: ByStatus<number> = {
  single: 200_000,
  'married-joint': 400_000,
  'married-separate': 200_000,
  'head-of-household': 200_000,
};
export const CTC_PHASEOUT_RATE = 50;
export const CTC_PHASEOUT_STEP = 1_000;
export const CTC_MAX_CHILD_AGE = 16;

export const SE_NET_EARNINGS_FACTOR = 0.9235;
export const SE_SOCIAL_SECURITY_RATE = 0.124;
export const SE_MEDICARE_RATE = 0.029;
export const SOCIAL_SECURITY_WAGE_BASE = 184_500; // SSA 2026
export const SE_TAX_FLOOR = 400;

export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD: ByStatus<number> = {
  single: 200_000,
  'married-joint': 250_000,
  'married-separate': 125_000,
  'head-of-household': 200_000,
};

export const NIIT_RATE = 0.038;
export const NIIT_THRESHOLD: ByStatus<number> = {
  single: 200_000,
  'married-joint': 250_000,
  'married-separate': 125_000,
  'head-of-household': 200_000,
};

export const QBI_RATE = 0.2;

export const CAPITAL_LOSS_LIMIT: ByStatus<number> = {
  single: 3_000,
  'married-joint': 3_000,
  'married-separate': 1_500,
  'head-of-household': 3_000,
};

/** OBBBA: the $40k 2025 cap indexes 1%/yr through 2029. */
export const SALT_CAP: ByStatus<number> = {
  single: 40_400,
  'married-joint': 40_400,
  'married-separate': 20_200,
  'head-of-household': 40_400,
};
export const SALT_CAP_FLOOR: ByStatus<number> = {
  single: 10_000,
  'married-joint': 10_000,
  'married-separate': 5_000,
  'head-of-household': 10_000,
};
export const SALT_PHASEDOWN_START: ByStatus<number> = {
  single: 505_000,
  'married-joint': 505_000,
  'married-separate': 252_500,
  'head-of-household': 505_000,
};
export const SALT_PHASEDOWN_RATE = 0.3;

export const MEDICAL_AGI_FLOOR = 0.075;

export const STUDENT_LOAN_INTEREST_CAP = 2_500;
/** Carried forward from 2025 pending the final figure — conservative. */
export const STUDENT_LOAN_PHASEOUT: ByStatus<{ start: number; end: number } | null> = {
  single: { start: 85_000, end: 100_000 },
  'married-joint': { start: 170_000, end: 200_000 },
  'married-separate': null,
  'head-of-household': { start: 85_000, end: 100_000 },
};

export const IRA_CONTRIBUTION_LIMIT = 8_600; // $7,500 + $1,100 catch-up
export const HSA_CONTRIBUTION_LIMIT = 9_750; // family + catch-up ceiling
export const EDUCATOR_EXPENSE_LIMIT = 300;
