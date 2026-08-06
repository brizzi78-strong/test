/**
 * Pure federal tax engine for tax year 2025.
 *
 * Takes a TaxReturn document and derives the full Form 1040 computation:
 * income aggregation, adjustments, standard-vs-itemized choice, the QBI
 * deduction, ordinary brackets plus the qualified-dividend / capital-gain
 * worksheet, SE tax, additional Medicare tax, NIIT, and the child tax credit.
 *
 * Simplifications relative to a full commercial product are documented in
 * taxfile/README.md (no EITC, no AMT, non-refundable-only CTC, etc.).
 */

import * as P from './taxYear2025.ts';
import type {
  FilingStatus,
  IncomeSection,
  ItemizedDeductions,
  MedicalDeductionDetail,
  TaxComputation,
  TaxReturn,
} from './types.ts';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const clampMin0 = (n: number): number => Math.max(0, n);

/** Tax on ordinary income using the bracket schedule for the status. */
export function ordinaryTax(taxable: number, status: FilingStatus): number {
  let tax = 0;
  let lower = 0;
  for (const bracket of P.ORDINARY_BRACKETS[status]) {
    if (taxable <= lower) break;
    const inBracket = Math.min(taxable, bracket.upTo) - lower;
    tax += inBracket * bracket.rate;
    lower = bracket.upTo;
  }
  return round2(tax);
}

/** Top ordinary bracket rate reached at the given taxable income. */
export function marginalRate(taxable: number, status: FilingStatus): number {
  const brackets = P.ORDINARY_BRACKETS[status];
  for (const bracket of brackets) {
    if (taxable <= bracket.upTo) return bracket.rate;
  }
  return brackets[brackets.length - 1]!.rate;
}

/**
 * Qualified Dividends and Capital Gain Tax Worksheet: ordinary rates on
 * non-preferential income stacked under 0/15/20% rates on preferential income.
 */
export function taxWithPreferentialRates(
  taxableIncome: number,
  preferentialIncome: number,
  status: FilingStatus,
): number {
  const pref = Math.min(clampMin0(preferentialIncome), clampMin0(taxableIncome));
  const ordinary = clampMin0(taxableIncome) - pref;
  const { zeroUpTo, fifteenUpTo } = P.CAPITAL_GAINS_THRESHOLDS[status];

  // Preferential income stacks on top of ordinary income.
  const zeroBand = clampMin0(Math.min(taxableIncome, zeroUpTo) - ordinary);
  const fifteenBand = clampMin0(Math.min(taxableIncome, fifteenUpTo) - ordinary - zeroBand);
  const twentyBand = pref - zeroBand - fifteenBand;

  const prefTax = fifteenBand * 0.15 + twentyBand * 0.2;
  const worksheetTax = round2(ordinaryTax(ordinary, status) + prefTax);
  // The worksheet never produces more tax than all-ordinary treatment.
  return Math.min(worksheetTax, ordinaryTax(taxableIncome, status));
}

/** Standard deduction incl. additional amounts for age 65+ and blindness. */
export function standardDeduction(ret: TaxReturn, status: FilingStatus): number {
  let extras = 0;
  const people = [ret.personal?.taxpayer, status === 'married-joint' ? ret.personal?.spouse : undefined];
  for (const person of people) {
    if (!person) continue;
    if (ret.taxYear - person.birthYear >= 65) extras += 1;
    if (person.blind) extras += 1;
  }
  return P.STANDARD_DEDUCTION[status] + extras * P.ADDITIONAL_STANDARD_DEDUCTION[status];
}

export interface SeTaxResult {
  netProfit: number; // Schedule C net profit (can be negative)
  seTax: number;
  halfSeTaxDeduction: number;
}

/** Schedule SE: self-employment tax on 1099-NEC income less expenses. */
export function selfEmploymentTax(income: IncomeSection): SeTaxResult {
  const gross = income.nec1099s.reduce((sum, f) => sum + f.compensation, 0);
  const netProfit = round2(gross - income.businessExpenses);
  const netEarnings = round2(netProfit * P.SE_NET_EARNINGS_FACTOR);
  if (netEarnings < P.SE_TAX_FLOOR) {
    return { netProfit, seTax: 0, halfSeTaxDeduction: 0 };
  }
  const socialSecurity = Math.min(netEarnings, P.SOCIAL_SECURITY_WAGE_BASE) * P.SE_SOCIAL_SECURITY_RATE;
  const medicare = netEarnings * P.SE_MEDICARE_RATE;
  const seTax = round2(socialSecurity + medicare);
  return { netProfit, seTax, halfSeTaxDeduction: round2(seTax / 2) };
}

/** Student loan interest deduction with the MAGI phase-out. */
export function studentLoanInterestDeduction(
  paid: number,
  magi: number,
  status: FilingStatus,
): number {
  const phaseout = P.STUDENT_LOAN_PHASEOUT[status];
  if (!phaseout || paid <= 0) return 0;
  const capped = Math.min(paid, P.STUDENT_LOAN_INTEREST_CAP);
  if (magi <= phaseout.start) return capped;
  if (magi >= phaseout.end) return 0;
  const fraction = (phaseout.end - magi) / (phaseout.end - phaseout.start);
  return round2(capped * fraction);
}

/**
 * Medical expenses against the 7.5%-of-AGI floor: total tracked spend, the
 * floor itself, the deductible excess, and how far below the floor the
 * taxpayer still is (for the "you'd need $X more" tracker).
 */
export function medicalDeduction(item: ItemizedDeductions, agi: number): MedicalDeductionDetail {
  // Returns saved before entry tracking existed have no entries array.
  const entries = item.medicalExpenseEntries ?? [];
  const totalExpenses = round2(
    clampMin0(item.medicalExpenses) + entries.reduce((s, e) => s + clampMin0(e.amount), 0),
  );
  const agiFloor = round2(clampMin0(agi) * P.MEDICAL_AGI_FLOOR);
  return {
    totalExpenses,
    agiFloor,
    deductible: round2(clampMin0(totalExpenses - agiFloor)),
    amountToThreshold: round2(clampMin0(agiFloor - totalExpenses)),
  };
}

/** SALT deduction: OBBBA cap with the high-income phase-down. */
export function saltDeduction(paid: number, magi: number, status: FilingStatus): number {
  let cap = P.SALT_CAP[status];
  const start = P.SALT_PHASEDOWN_START[status];
  if (magi > start) {
    cap = Math.max(P.SALT_CAP_FLOOR[status], cap - (magi - start) * P.SALT_PHASEDOWN_RATE);
  }
  return round2(Math.min(clampMin0(paid), cap));
}

export interface CtcResult {
  qualifyingChildren: number;
  otherDependents: number;
  childTaxCredit: number;
  creditForOtherDependents: number;
}

/** Child tax credit + credit for other dependents, with the AGI phase-out. */
export function childTaxCredit(
  children: number,
  others: number,
  agi: number,
  status: FilingStatus,
): CtcResult {
  const gross =
    children * P.CHILD_TAX_CREDIT_PER_CHILD + others * P.OTHER_DEPENDENT_CREDIT;
  const over = clampMin0(agi - P.CTC_PHASEOUT_START[status]);
  const reduction = Math.ceil(over / P.CTC_PHASEOUT_STEP) * P.CTC_PHASEOUT_RATE;
  const allowed = clampMin0(gross - reduction);
  // Attribute the remaining credit to the CTC first, then the ODC.
  const ctc = Math.min(allowed, children * P.CHILD_TAX_CREDIT_PER_CHILD);
  const odc = allowed - ctc;
  return {
    qualifyingChildren: children,
    otherDependents: others,
    childTaxCredit: ctc,
    creditForOtherDependents: odc,
  };
}

/** Full 1040 computation. Requires filingStatus to be set on the return. */
export function computeReturn(ret: TaxReturn): TaxComputation {
  const status = ret.filingStatus;
  if (!status) throw new Error('filing status must be set before computing');
  const income = ret.income;
  const deductions = ret.deductions;

  // --- Income ---------------------------------------------------------
  const wages = round2(income.w2s.reduce((s, w) => s + w.wages, 0));
  const interest = round2(income.int1099s.reduce((s, f) => s + f.interestIncome, 0));
  const ordinaryDividends = round2(income.div1099s.reduce((s, f) => s + f.ordinaryDividends, 0));
  const qualifiedDividends = round2(
    income.div1099s.reduce((s, f) => s + Math.min(f.qualifiedDividends, f.ordinaryDividends), 0),
  );
  const capGainDistributions = round2(
    income.div1099s.reduce((s, f) => s + f.capitalGainDistributions, 0),
  );

  const se = selfEmploymentTax(income);

  // Net capital gain/loss; losses offset ordinary income only up to the limit.
  const longTerm = income.capitalGainLongTerm + capGainDistributions;
  const netCapital = income.capitalGainShortTerm + longTerm;
  const capitalGainOrLoss = round2(Math.max(netCapital, -P.CAPITAL_LOSS_LIMIT[status]));
  // Preferential-rate income: net LT gain, no more than the overall net gain.
  const preferentialGains = clampMin0(Math.min(longTerm, clampMin0(netCapital)));

  const totalIncome = round2(
    wages +
      interest +
      ordinaryDividends +
      capitalGainOrLoss +
      se.netProfit +
      income.unemploymentCompensation +
      income.otherIncome,
  );

  // --- Adjustments (above-the-line) ------------------------------------
  const adj = deductions.adjustments;
  const fixedAdjustments =
    se.halfSeTaxDeduction +
    Math.min(clampMin0(adj.traditionalIraContributions), P.IRA_CONTRIBUTION_LIMIT) +
    Math.min(clampMin0(adj.hsaContributions), P.HSA_CONTRIBUTION_LIMIT) +
    Math.min(clampMin0(adj.educatorExpenses), P.EDUCATOR_EXPENSE_LIMIT);
  const magiForStudentLoan = totalIncome - fixedAdjustments;
  const studentLoan = studentLoanInterestDeduction(adj.studentLoanInterest, magiForStudentLoan, status);
  const totalAdjustments = round2(fixedAdjustments + studentLoan);
  const agi = round2(totalIncome - totalAdjustments);

  // --- Deduction: standard vs itemized ---------------------------------
  const std = standardDeduction(ret, status);
  const item = deductions.itemized;
  const medical = medicalDeduction(item, agi);
  const itemized = round2(
    medical.deductible +
      saltDeduction(item.stateLocalTaxes, agi, status) +
      clampMin0(item.mortgageInterest) +
      clampMin0(item.charitableContributions),
  );
  const useItemized =
    deductions.method === 'itemized' || (deductions.method === 'auto' && itemized > std);
  const deduction = useItemized ? itemized : std;

  // --- QBI deduction (simplified: under-threshold rules) ---------------
  const qbiIncome = clampMin0(se.netProfit - se.halfSeTaxDeduction);
  const incomeBeforeQbi = clampMin0(agi - deduction);
  const qbiDeduction = round2(
    Math.min(qbiIncome * P.QBI_RATE, clampMin0(incomeBeforeQbi - preferentialGains - qualifiedDividends) * P.QBI_RATE),
  );

  const taxableIncome = clampMin0(round2(agi - deduction - qbiDeduction));

  // --- Tax --------------------------------------------------------------
  const preferentialIncome = qualifiedDividends + preferentialGains;
  const incomeTax = taxWithPreferentialRates(taxableIncome, preferentialIncome, status);

  // Additional Medicare tax on earned income (wages + net SE earnings).
  const seEarnings = clampMin0(round2(se.netProfit * P.SE_NET_EARNINGS_FACTOR));
  const additionalMedicareTax = round2(
    clampMin0(wages + seEarnings - P.ADDITIONAL_MEDICARE_THRESHOLD[status]) *
      P.ADDITIONAL_MEDICARE_RATE,
  );

  // Net investment income tax.
  const netInvestmentIncome = clampMin0(interest + ordinaryDividends + capitalGainOrLoss);
  const niit = round2(
    Math.min(netInvestmentIncome, clampMin0(agi - P.NIIT_THRESHOLD[status])) * P.NIIT_RATE,
  );

  // --- Credits ----------------------------------------------------------
  const eligibleChildren = ret.dependents.filter(
    (d) => d.relationship === 'child' && ret.taxYear - d.birthYear <= P.CTC_MAX_CHILD_AGE,
  ).length;
  const otherDeps = ret.dependents.length - eligibleChildren;
  const ctc = childTaxCredit(eligibleChildren, otherDeps, agi, status);
  // Non-refundable: cannot reduce regular income tax below zero.
  const totalCredits = Math.min(ctc.childTaxCredit + ctc.creditForOtherDependents, incomeTax);

  const totalTax = round2(
    clampMin0(incomeTax - totalCredits) + se.seTax + additionalMedicareTax + niit,
  );

  // --- Payments and balance ---------------------------------------------
  const withholding = round2(
    income.w2s.reduce((s, w) => s + w.federalWithholding, 0) +
      income.int1099s.reduce((s, f) => s + f.federalWithholding, 0) +
      income.div1099s.reduce((s, f) => s + f.federalWithholding, 0),
  );
  const estimatedPayments = round2(income.estimatedTaxPayments);
  const totalPayments = round2(withholding + estimatedPayments);
  const balance = round2(totalPayments - totalTax);

  const lines: TaxComputation['lines'] = [
    { label: 'Wages (W-2)', amount: wages },
    { label: 'Interest income', amount: interest },
    { label: 'Ordinary dividends', amount: ordinaryDividends },
    { label: 'Capital gain or (loss)', amount: capitalGainOrLoss },
    { label: 'Self-employment net profit', amount: se.netProfit },
    { label: 'Unemployment compensation', amount: income.unemploymentCompensation },
    { label: 'Other income', amount: income.otherIncome },
    { label: 'Total income', amount: totalIncome },
    { label: 'Adjustments to income', amount: totalAdjustments },
    { label: 'Adjusted gross income', amount: agi },
    { label: useItemized ? 'Itemized deductions' : 'Standard deduction', amount: deduction },
    { label: 'Qualified business income deduction', amount: qbiDeduction },
    { label: 'Taxable income', amount: taxableIncome },
    { label: 'Income tax', amount: incomeTax },
    { label: 'Child tax credit / other dependents', amount: -totalCredits },
    { label: 'Self-employment tax', amount: se.seTax },
    { label: 'Additional Medicare tax', amount: additionalMedicareTax },
    { label: 'Net investment income tax', amount: niit },
    { label: 'Total tax', amount: totalTax },
    { label: 'Federal tax withheld', amount: withholding },
    { label: 'Estimated tax payments', amount: estimatedPayments },
    { label: balance >= 0 ? 'Refund' : 'Amount you owe', amount: Math.abs(balance) },
  ];

  return {
    taxYear: ret.taxYear,
    filingStatus: status,
    totalIncome,
    adjustments: totalAdjustments,
    adjustedGrossIncome: agi,
    deductionMethod: useItemized ? 'itemized' : 'standard',
    deduction,
    medical,
    qbiDeduction,
    taxableIncome,
    incomeTax,
    selfEmploymentTax: se.seTax,
    additionalMedicareTax,
    netInvestmentIncomeTax: niit,
    childTaxCredit: ctc.childTaxCredit,
    creditForOtherDependents: ctc.creditForOtherDependents,
    totalCredits,
    totalTax,
    withholding,
    estimatedPayments,
    totalPayments,
    refund: clampMin0(balance),
    amountOwed: clampMin0(-balance),
    effectiveRate: agi > 0 ? round2((totalTax / agi) * 10000) / 10000 : 0,
    marginalRate: marginalRate(taxableIncome, status),
    lines,
  };
}
