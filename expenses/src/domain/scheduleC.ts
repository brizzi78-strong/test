/**
 * Schedule C treatment for filed expenses — the seam between this app and the
 * tax return in `taxfile/`, whose income model takes a single
 * `businessExpenses` figure and derives net profit and SE tax from it.
 *
 * Not every dollar spent is a dollar deducted, which is the whole reason this
 * module exists rather than just summing the reports:
 *
 *   - Business meals are 50% deductible. (The temporary 100% restaurant
 *     deduction applied only to 2021 and 2022.)
 *   - Entertainment has been fully non-deductible since the TCJA took effect
 *     in 2018 — even when the business purpose is genuine.
 *   - Travel, office and software costs are deductible in full.
 *   - Mileage is already carried at the IRS standard rate, so the amount on
 *     the expense *is* the deduction; no second computation.
 *
 * These are the ordinary-case federal rules and a starting point for a
 * return, not tax advice: actual deductibility turns on facts this app does
 * not model (business use percentage, lavishness, employer reimbursement,
 * capitalization thresholds, state treatment).
 */

import type { Category, Expense } from './types.ts';

/** The Schedule C line an expense category lands on. */
export type ScheduleCLine = '9' | '18' | '24a' | '24b' | '27a' | 'none';

export interface LineTreatment {
  line: ScheduleCLine;
  label: string;
  /** Share of the spend that is deductible, 0–1. */
  rate: number;
}

/** Category → Schedule C line and deductible share. */
export const TREATMENT: Record<Category, LineTreatment> = {
  mileage: { line: '9', label: 'Car and truck expenses', rate: 1 },
  office_supplies: { line: '18', label: 'Office expense', rate: 1 },
  airfare: { line: '24a', label: 'Travel', rate: 1 },
  lodging: { line: '24a', label: 'Travel', rate: 1 },
  ground_transport: { line: '24a', label: 'Travel', rate: 1 },
  meals: { line: '24b', label: 'Deductible meals', rate: 0.5 },
  entertainment: { line: 'none', label: 'Entertainment (not deductible)', rate: 0 },
  software: { line: '27a', label: 'Other expenses', rate: 1 },
  other: { line: '27a', label: 'Other expenses', rate: 1 },
};

export interface ScheduleCLineSummary {
  line: ScheduleCLine;
  label: string;
  rate: number;
  /** What was spent in the categories on this line. */
  spentCents: number;
  /** What may be deducted from that spend. */
  deductibleCents: number;
  categories: Category[];
}

export interface ScheduleCSummary {
  year: number;
  lines: ScheduleCLineSummary[];
  totalSpentCents: number;
  /** Sum of the deductible amounts — TaxFile's `businessExpenses`. */
  totalDeductibleCents: number;
  /** Spend that is not deductible at all, or only partly. */
  disallowedCents: number;
  expenseCount: number;
  /**
   * Repeat filings of the same purchase, left out of the totals above. The
   * policy engine flags duplicates rather than blocking them, so without this
   * the same airfare on two draft reports would be deducted twice.
   */
  duplicatesExcludedCents: number;
  duplicatesExcludedCount: number;
}

/**
 * IRS standard mileage rates for business use, in cents per mile. A company
 * may reimburse at any rate it likes, but only the standard rate is
 * deductible, so the deduction is computed from the miles rather than from
 * whatever the expense was reimbursed at.
 */
export const IRS_MILEAGE_RATE_CENTS: Readonly<Record<number, number>> = {
  2023: 65.5,
  2024: 67,
  2025: 70,
};

/**
 * Deductible portion of one expense, rounded to the cent.
 *
 * Mileage is computed from the miles at the year's IRS standard rate when
 * both are known; a company rate above the standard one is not deductible,
 * and one below it does not cap the deduction. Without a known rate for the
 * year, the recorded amount stands.
 */
export function deductibleCents(
  expense: Pick<Expense, 'category' | 'amountCents' | 'miles'>,
  year?: number,
): number {
  if (expense.category === 'mileage' && expense.miles !== undefined) {
    const rate = year === undefined ? undefined : IRS_MILEAGE_RATE_CENTS[year];
    if (rate !== undefined) return Math.round(expense.miles * rate);
  }
  const { rate } = TREATMENT[expense.category];
  return Math.round(expense.amountCents * rate);
}

/** Same key the policy engine uses to spot the same purchase entered twice. */
const duplicateKey = (e: Expense): string =>
  `${e.date}|${e.merchant.trim().toLowerCase()}|${e.amountCents}`;

/** Line ordering follows the form itself, with the non-deductible bucket last. */
const LINE_ORDER: ScheduleCLine[] = ['9', '18', '24a', '24b', '27a', 'none'];

/**
 * Roll a year's expenses up by Schedule C line. Callers decide which reports
 * count; this function only applies the tax treatment.
 */
export function summarizeScheduleC(year: number, expenses: Expense[]): ScheduleCSummary {
  const byLine = new Map<ScheduleCLine, ScheduleCLineSummary>();
  let totalSpentCents = 0;
  let totalDeductibleCents = 0;
  let duplicatesExcludedCents = 0;
  let duplicatesExcludedCount = 0;
  const seen = new Set<string>();

  for (const e of expenses) {
    // One purchase, one deduction — however many reports it was filed on.
    const key = duplicateKey(e);
    if (seen.has(key)) {
      duplicatesExcludedCents += e.amountCents;
      duplicatesExcludedCount++;
      continue;
    }
    seen.add(key);

    const treatment = TREATMENT[e.category];
    const entry = byLine.get(treatment.line) ?? {
      line: treatment.line,
      label: treatment.label,
      rate: treatment.rate,
      spentCents: 0,
      deductibleCents: 0,
      categories: [],
    };
    const deductible = deductibleCents(e, year);
    entry.spentCents += e.amountCents;
    entry.deductibleCents += deductible;
    if (!entry.categories.includes(e.category)) entry.categories.push(e.category);
    byLine.set(treatment.line, entry);

    totalSpentCents += e.amountCents;
    totalDeductibleCents += deductible;
  }

  const lines = [...byLine.values()].sort(
    (a, b) => LINE_ORDER.indexOf(a.line) - LINE_ORDER.indexOf(b.line),
  );
  for (const line of lines) line.categories.sort();

  return {
    year,
    lines,
    totalSpentCents,
    totalDeductibleCents,
    disallowedCents: totalSpentCents - totalDeductibleCents,
    expenseCount: expenses.length - duplicatesExcludedCount,
    duplicatesExcludedCents,
    duplicatesExcludedCount,
  };
}
