/**
 * Gross-to-net payroll engine (pure functions).
 *
 * Given an employee's period gross, deductions, YTD wage bases, and a tax
 * config, compute the full paycheck breakdown. Deliberately free of storage or
 * I/O so the math can be unit-tested in isolation.
 *
 * Order of operations (standard US payroll):
 *   1. gross for the period
 *   2. subtract pre-tax deductions to get each taxable wage base (FICA vs.
 *      income tax bases differ — a 401(k) cuts income-tax wages but not FICA)
 *   3. FICA: Social Security (capped at the annual wage base) + Medicare
 *      (+ Additional Medicare above the YTD threshold)
 *   4. Federal income tax via the annual percentage method
 *   5. NC flat state income tax on annualized state wages
 *   6. net = gross - all taxes - all deductions
 *   7. employer taxes (SS/Medicare match, FUTA, NC SUTA)
 */

import type { TaxBracket, TaxConfig } from './taxTables.ts';
import type {
  EmployerTaxes,
  FilingStatus,
  PreTaxDeduction,
  YtdWages,
} from './types.ts';

export interface EngineInput {
  grossCents: number;
  filingStatus: FilingStatus;
  periodsPerYear: number;
  ncAllowances: number;
  federalExtraWithholdingCents: number;
  federalDependentsAnnualCreditCents: number;
  preTaxDeductions: PreTaxDeduction[];
  postTaxDeductionsCents: number;
  ytd: YtdWages;
}

export interface EngineResult {
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
}

const sumBy = (ds: PreTaxDeduction[], pick: (d: PreTaxDeduction) => boolean): number =>
  ds.filter(pick).reduce((t, d) => t + d.amountCents, 0);

/** Federal income tax for one period via the annual percentage method. */
export function federalIncomeTaxCents(
  periodTaxableCents: number,
  periodsPerYear: number,
  brackets: TaxBracket[],
  dependentsAnnualCreditCents: number,
  extraWithholdingCents: number,
): number {
  const annual = periodTaxableCents * periodsPerYear;
  const row = bracketFor(annual, brackets);
  const annualTax = row.baseCents + row.rate * (annual - row.overCents);
  const afterCredits = Math.max(0, annualTax - dependentsAnnualCreditCents);
  return Math.max(0, Math.round(afterCredits / periodsPerYear) + extraWithholdingCents);
}

/** NC flat state income tax for one period, annualized with allowances. */
export function ncIncomeTaxCents(
  periodTaxableCents: number,
  periodsPerYear: number,
  config: TaxConfig,
  filingStatus: FilingStatus,
  allowances: number,
): number {
  const annual = periodTaxableCents * periodsPerYear;
  const taxable = Math.max(
    0,
    annual -
      config.ncStandardDeductionCents[filingStatus] -
      Math.max(0, allowances) * config.ncAllowanceValueCents,
  );
  return Math.max(0, Math.round((taxable * config.ncRate) / periodsPerYear));
}

export function computePayslip(input: EngineInput, config: TaxConfig): EngineResult {
  const gross = input.grossCents;
  const preTaxTotal = input.preTaxDeductions.reduce((t, d) => t + d.amountCents, 0);

  const ficaWages = Math.max(0, gross - sumBy(input.preTaxDeductions, (d) => d.reducesFica));
  const federalTaxable = Math.max(0, gross - sumBy(input.preTaxDeductions, (d) => d.reducesFederalTaxable));
  const stateTaxable = Math.max(0, gross - sumBy(input.preTaxDeductions, (d) => d.reducesStateTaxable));

  // --- Social Security (capped at the annual wage base) ---
  const ssRemaining = Math.max(0, config.socialSecurityWageBaseCents - input.ytd.ficaWages);
  const ssTaxable = Math.min(ficaWages, ssRemaining);
  const socialSecurity = Math.round(ssTaxable * config.socialSecurityRate);

  // --- Medicare (+ Additional Medicare above the YTD threshold) ---
  const medicare = Math.round(ficaWages * config.medicareRate);
  const ytdFicaAfter = input.ytd.ficaWages + ficaWages;
  const newlyOver = Math.max(0, ytdFicaAfter - config.additionalMedicareThresholdCents);
  const previouslyOver = Math.max(0, input.ytd.ficaWages - config.additionalMedicareThresholdCents);
  const addlMedicareWages = Math.max(0, newlyOver - previouslyOver);
  const additionalMedicare = Math.round(addlMedicareWages * config.additionalMedicareRate);

  // --- Income taxes ---
  const federalIncomeTax = federalIncomeTaxCents(
    federalTaxable,
    input.periodsPerYear,
    config.federalBrackets[input.filingStatus],
    input.federalDependentsAnnualCreditCents,
    input.federalExtraWithholdingCents,
  );
  const stateIncomeTax = ncIncomeTaxCents(
    stateTaxable,
    input.periodsPerYear,
    config,
    input.filingStatus,
    input.ncAllowances,
  );

  const net =
    gross -
    socialSecurity -
    medicare -
    additionalMedicare -
    federalIncomeTax -
    stateIncomeTax -
    preTaxTotal -
    input.postTaxDeductionsCents;

  // --- Employer taxes ---
  const employer: EmployerTaxes = {
    socialSecurityCents: socialSecurity, // employer matches the employee SS
    medicareCents: medicare, // employer matches base Medicare (not Additional)
    futaCents: employerUnemployment(gross, input.ytd.gross, config.futaWageBaseCents, config.futaRate),
    sutaCents: employerUnemployment(gross, input.ytd.gross, config.sutaWageBaseCents, config.sutaRate),
  };

  return {
    grossCents: gross,
    ficaWagesCents: ficaWages,
    federalTaxableCents: federalTaxable,
    stateTaxableCents: stateTaxable,
    socialSecurityCents: socialSecurity,
    medicareCents: medicare,
    additionalMedicareCents: additionalMedicare,
    federalIncomeTaxCents: federalIncomeTax,
    stateIncomeTaxCents: stateIncomeTax,
    preTaxDeductionsCents: preTaxTotal,
    postTaxDeductionsCents: input.postTaxDeductionsCents,
    netCents: net,
    employer,
  };
}

function employerUnemployment(
  grossCents: number,
  ytdGrossCents: number,
  wageBaseCents: number,
  rate: number,
): number {
  const remaining = Math.max(0, wageBaseCents - ytdGrossCents);
  const taxable = Math.min(grossCents, remaining);
  return Math.round(taxable * rate);
}

function bracketFor(annualCents: number, brackets: TaxBracket[]): TaxBracket {
  let match = brackets[0];
  for (const b of brackets) {
    if (annualCents >= b.overCents) match = b;
    else break;
  }
  return match;
}
