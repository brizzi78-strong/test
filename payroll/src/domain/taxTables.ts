/**
 * Tax configuration for a Raleigh, North Carolina work location.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ VERIFY BEFORE REAL USE. Every number here is published tax data that   │
 * │ changes yearly. The federal figures are the 2025 IRS Pub. 15-T annual  │
 * │ percentage-method (STANDARD withholding, Form W-4 Step 2 NOT checked). │
 * │ The NC income-tax rate is the 3.99% scheduled for 2026. Confirm all    │
 * │ values against IRS Pub. 15-T and the NC Dept. of Revenue for the tax   │
 * │ year you actually run, then update this one file.                      │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Why Raleigh is simple: North Carolina levies a FLAT state income tax and has
 * NO local/city income tax, so there is no Raleigh or Wake County wage tax to
 * model — just federal + NC.
 *
 * All amounts are integer cents.
 */

import type { FilingStatus } from './types.ts';

/** One row of an annual percentage-method table: tax = base + rate*(wages-over). */
export interface TaxBracket {
  overCents: number;
  baseCents: number;
  rate: number;
}

export interface TaxConfig {
  jurisdiction: string;
  /** Label of the tax year these figures were taken from. */
  sourceNote: string;

  // --- FICA ---
  socialSecurityRate: number;
  socialSecurityWageBaseCents: number;
  medicareRate: number;
  additionalMedicareRate: number;
  additionalMedicareThresholdCents: number;

  // --- Federal income tax (annual percentage method, standard) ---
  federalBrackets: Record<FilingStatus, TaxBracket[]>;

  // --- North Carolina income tax (flat) ---
  ncRate: number;
  ncStandardDeductionCents: Record<FilingStatus, number>;
  ncAllowanceValueCents: number;

  // --- Employer unemployment ---
  futaRate: number;
  futaWageBaseCents: number;
  sutaRate: number;
  sutaWageBaseCents: number;
}

const D = (dollars: number): number => Math.round(dollars * 100);

// IRS Pub. 15-T (2025), Worksheet 1A annual percentage method, STANDARD.
const FEDERAL_2025: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { overCents: D(0), baseCents: D(0), rate: 0 },
    { overCents: D(6400), baseCents: D(0), rate: 0.1 },
    { overCents: D(18325), baseCents: D(1192.5), rate: 0.12 },
    { overCents: D(54875), baseCents: D(5578.5), rate: 0.22 },
    { overCents: D(109750), baseCents: D(17651), rate: 0.24 },
    { overCents: D(203700), baseCents: D(40199), rate: 0.32 },
    { overCents: D(256925), baseCents: D(57231), rate: 0.35 },
    { overCents: D(632750), baseCents: D(188769.75), rate: 0.37 },
  ],
  married_joint: [
    { overCents: D(0), baseCents: D(0), rate: 0 },
    { overCents: D(17100), baseCents: D(0), rate: 0.1 },
    { overCents: D(40950), baseCents: D(2385), rate: 0.12 },
    { overCents: D(114050), baseCents: D(11157), rate: 0.22 },
    { overCents: D(223800), baseCents: D(35302), rate: 0.24 },
    { overCents: D(411700), baseCents: D(80398), rate: 0.32 },
    { overCents: D(518150), baseCents: D(114462), rate: 0.35 },
    { overCents: D(768700), baseCents: D(202154.5), rate: 0.37 },
  ],
  head_of_household: [
    { overCents: D(0), baseCents: D(0), rate: 0 },
    { overCents: D(13900), baseCents: D(0), rate: 0.1 },
    { overCents: D(30900), baseCents: D(1700), rate: 0.12 },
    { overCents: D(78750), baseCents: D(7442), rate: 0.22 },
    { overCents: D(117250), baseCents: D(15912), rate: 0.24 },
    { overCents: D(211200), baseCents: D(38460), rate: 0.32 },
    { overCents: D(264400), baseCents: D(55484), rate: 0.35 },
    { overCents: D(640250), baseCents: D(187031.5), rate: 0.37 },
  ],
};

/** The Raleigh, NC configuration. */
export const RALEIGH_NC: TaxConfig = {
  jurisdiction: 'raleigh_nc',
  sourceNote: 'Federal: IRS Pub. 15-T 2025 (standard). NC: 3.99% flat scheduled for 2026. VERIFY for your tax year.',

  socialSecurityRate: 0.062,
  socialSecurityWageBaseCents: D(176100), // 2025 SSA wage base — update annually.
  medicareRate: 0.0145,
  additionalMedicareRate: 0.009,
  additionalMedicareThresholdCents: D(200000), // withholding threshold, all filing statuses

  federalBrackets: FEDERAL_2025,

  ncRate: 0.0399, // North Carolina flat rate scheduled for 2026
  ncStandardDeductionCents: {
    single: D(12750),
    married_joint: D(25500),
    head_of_household: D(19125),
  },
  ncAllowanceValueCents: D(2500),

  futaRate: 0.006, // net rate with full state credit; base wages
  futaWageBaseCents: D(7000),
  sutaRate: 0.01, // NC new-employer rate — set your assigned rate
  sutaWageBaseCents: D(32600), // NC 2025 SUTA wage base — update annually
};

export const JURISDICTIONS: Record<string, TaxConfig> = {
  raleigh_nc: RALEIGH_NC,
};

export function taxConfigFor(jurisdiction: string): TaxConfig | undefined {
  return JURISDICTIONS[jurisdiction];
}
