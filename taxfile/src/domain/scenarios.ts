/**
 * Planning scenarios: the Pro-tier tools. Every scenario is the same pure
 * engine run again with one thing changed, so results are exactly as
 * trustworthy as the base estimate — no separate approximations.
 */

import { computeReturn, round2 } from './engine.ts';
import { paramsForYear } from './params.ts';
import type { TaxComputation, TaxReturn } from './types.ts';

export interface Scenario {
  id: string;
  title: string;
  detail: string;
  /** Positive = money back in your pocket vs. the base estimate. */
  savings?: number;
  /** Free-form figures the UI renders as label/value rows. */
  figures: Array<{ label: string; amount: number }>;
}

/** Quarterly estimated-payment due dates for a tax year. */
function quarterlyDueDates(taxYear: number): string[] {
  return [
    `April 15, ${taxYear}`,
    `June 15, ${taxYear}`,
    `September 15, ${taxYear}`,
    `January 15, ${taxYear + 1}`,
  ];
}

function withIra(ret: TaxReturn, extra: number): TaxReturn {
  const clone = structuredClone(ret);
  clone.deductions.adjustments.traditionalIraContributions += extra;
  return clone;
}

function withIncome(ret: TaxReturn, extra: number): TaxReturn {
  const clone = structuredClone(ret);
  clone.income.otherIncome += extra;
  return clone;
}

/**
 * Build the scenario set for a computable return. Assumes the caller has
 * already verified scope support and that filingStatus is set.
 */
export function buildScenarios(ret: TaxReturn, base: TaxComputation): Scenario[] {
  const params = paramsForYear(ret.taxYear);
  const scenarios: Scenario[] = [];

  // --- IRA headroom: what would maxing the deduction save? ---------------
  const current = ret.deductions.adjustments.traditionalIraContributions;
  const room = round2(Math.max(0, params.IRA_CONTRIBUTION_LIMIT - current));
  if (room > 0) {
    const alt = computeReturn(withIra(ret, room));
    const savings = round2(base.totalTax - alt.totalTax);
    scenarios.push({
      id: 'ira-headroom',
      title: `Contribute $${room.toLocaleString()} more to a traditional IRA`,
      detail:
        savings > 0
          ? 'Deductible contributions reduce taxable income directly. Eligibility can phase out if a workplace plan covers you — check that before writing the check.'
          : 'At your income and deductions, additional IRA contributions would not reduce this year’s federal tax.',
      savings,
      figures: [
        { label: 'Tax with the extra contribution', amount: alt.totalTax },
        { label: 'Tax as entered', amount: base.totalTax },
      ],
    });
  }

  // --- Quarterly estimated payments --------------------------------------
  if (base.amountOwed > 0) {
    const quarterly = round2(base.amountOwed / 4);
    scenarios.push({
      id: 'quarterly-payments',
      title: 'Spread the balance across quarterly payments',
      detail:
        `Paying $${quarterly.toLocaleString()} on each 1040-ES due date (${quarterlyDueDates(ret.taxYear).join('; ')}) ` +
        'covers the projected shortfall and reduces underpayment-penalty exposure.',
      figures: [
        { label: 'Projected balance due', amount: base.amountOwed },
        { label: 'Per-quarter payment', amount: quarterly },
      ],
    });

    // --- Withholding fix instead --------------------------------------
    const perPaycheck = round2(base.amountOwed / 26);
    scenarios.push({
      id: 'withholding-fix',
      title: 'Or fix it through withholding',
      detail:
        `Adding about $${perPaycheck.toLocaleString()} of extra federal withholding per biweekly paycheck ` +
        '(Form W-4, Step 4c) closes the same gap without quarterly payments. Withholding also counts as paid ' +
        'evenly through the year, which helps against penalties.',
      figures: [{ label: 'Extra per biweekly paycheck', amount: perPaycheck }],
    });
  }

  // --- Marginal rate: what the next $1,000 costs -------------------------
  const bumped = computeReturn(withIncome(ret, 1_000));
  const marginalCost = round2(bumped.totalTax - base.totalTax);
  scenarios.push({
    id: 'next-1000',
    title: 'What the next $1,000 of income costs you',
    detail:
      'The all-in federal cost of one more $1,000 of ordinary income — brackets plus any SE tax and surtaxes it drags in. Useful for pricing overtime, a side gig, or a Roth conversion.',
    figures: [
      { label: 'Federal tax on the next $1,000', amount: marginalCost },
      { label: 'You keep', amount: round2(1_000 - marginalCost) },
    ],
  });

  return scenarios;
}
