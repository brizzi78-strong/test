/**
 * Core domain types for the Payroll module — gross-to-net payroll runs,
 * configured for employees working in Raleigh, North Carolina.
 *
 * WHAT THIS IS: a withholding *calculator*. It computes an employee's paycheck
 * (gross → deductions → taxes → net) and the employer's payroll-tax liability.
 *
 * WHAT THIS IS NOT: certified, filing-ready payroll. It does not remit taxes,
 * move money (ACH), or file returns (941, W-2, NC-3). The tax figures are
 * seeded from a specific year's published tables (see ./taxTables.ts) and must
 * be verified for your tax year. For real payroll, back this with a registered
 * payroll provider and a tax professional.
 *
 * Money is integer cents throughout to avoid floating-point drift.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/** Federal filing status from the employee's Form W-4 (2020+). */
export type FilingStatus = 'single' | 'married_joint' | 'head_of_household';

export const FILING_STATUSES: readonly FilingStatus[] = [
  'single',
  'married_joint',
  'head_of_household',
];

export type PayType = 'salary' | 'hourly';

/**
 * A recurring pre-tax deduction. The three flags capture which wage bases the
 * deduction reduces — this materially changes the math:
 *   - a 401(k) reduces income-tax wages but NOT FICA wages
 *   - a Section-125 health premium / HSA reduces income-tax AND FICA wages
 */
export interface PreTaxDeduction {
  name: string;
  amountCents: number;
  reducesFederalTaxable: boolean;
  reducesStateTaxable: boolean;
  reducesFica: boolean;
}

export interface PostTaxDeduction {
  name: string;
  amountCents: number;
}

export interface Company {
  id: string;
  name: string;
  /** Tax jurisdiction key (e.g. 'raleigh_nc'); selects the tax config. */
  jurisdiction: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  payType: PayType;
  /** Annual salary in cents (salary employees). */
  annualSalaryCents?: number;
  /** Hourly rate in cents (hourly employees). */
  hourlyRateCents?: number;
  payFrequency: PayFrequency;
  filingStatus: FilingStatus;
  /** NC-4 withholding allowances. */
  ncAllowances: number;
  /** Extra federal withholding per period (W-4 Step 4c), in cents. */
  federalExtraWithholdingCents: number;
  /** Annual dependents credit (W-4 Step 3), in cents. */
  federalDependentsAnnualCreditCents: number;
  preTaxDeductions: PreTaxDeduction[];
  postTaxDeductions: PostTaxDeduction[];
  createdAt: string;
}

/** Year-to-date wage bases needed for caps/thresholds before a run. */
export interface YtdWages {
  gross: number;
  ficaWages: number;
}

/** A computed paycheck for one pay period. */
export interface Payslip {
  id: string;
  companyId: string;
  employeeId: string;
  /** Pay-period end date (ISO), supplied by the caller. */
  payDate: string;
  hours?: number;

  grossCents: number;
  ficaWagesCents: number;
  federalTaxableCents: number;
  stateTaxableCents: number;

  socialSecurityCents: number;
  medicareCents: number;
  additionalMedicareCents: number;
  federalIncomeTaxCents: number;
  stateIncomeTaxCents: number;

  preTaxDeductionsCents: number;
  postTaxDeductionsCents: number;
  netCents: number;

  employer: EmployerTaxes;
  createdAt: string;
}

export interface EmployerTaxes {
  socialSecurityCents: number;
  medicareCents: number;
  futaCents: number;
  /** NC State Unemployment (SUTA). */
  sutaCents: number;
}
