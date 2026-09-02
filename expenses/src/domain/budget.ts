/**
 * Monthly category budgets — the Mint-style budgeting component: a limit per
 * category per month, progress against it, and optional rollover of the
 * unused (or overspent) balance into the next month.
 *
 * Pure functions: callers supply what was actually spent per month, so the
 * arithmetic here is independent of how spend is stored or filtered.
 */

import type { Budget, BudgetProgress, BudgetStatus, BudgetSummary } from './types.ts';

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Spend at or above this share of the month's limit reads as a warning. */
export const BUDGET_WARNING_RATIO = 0.8;

/**
 * Rollover accumulates over at most this many months before the shown month,
 * so a budget started years ago cannot make a single request walk forever.
 */
export const ROLLOVER_MAX_MONTHS = 24;

export const isMonth = (value: string): boolean => MONTH_PATTERN.test(value);

/** The YYYY-MM a YYYY-MM-DD expense date falls in. */
export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

export const currentMonth = (now: Date = new Date()): string => now.toISOString().slice(0, 7);

/** Months since year 0 — lets month arithmetic avoid Date and its timezones. */
export function monthIndex(month: string): number {
  const [year, mon] = month.split('-');
  return Number(year) * 12 + (Number(mon) - 1);
}

export function monthFromIndex(index: number): string {
  const year = Math.floor(index / 12);
  const mon = index - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(mon).padStart(2, '0')}`;
}

/** Step a month by a signed number of months: addMonths('2026-01', -1) → '2025-12'. */
export const addMonths = (month: string, delta: number): string =>
  monthFromIndex(monthIndex(month) + delta);

function statusOf(remainingCents: number, ratio: number): BudgetStatus {
  if (remainingCents < 0) return 'over';
  return ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'under';
}

/** Whether a budget applies to a month yet. */
export const hasStarted = (budget: Budget, month: string): boolean =>
  monthIndex(month) >= monthIndex(budget.startMonth);

/**
 * Balance carried into `month`. Each earlier month's leftover (or overspend)
 * compounds into the next, exactly as Mint's rollover budgets did.
 *
 * The walk starts at the budget's carry anchor rather than its start month:
 * the anchor is reset (with the balance so far frozen into it) whenever the
 * limit changes, so raising a limit never retroactively rewrites the months
 * that were budgeted at the old one.
 */
export function rolloverInto(
  budget: Budget,
  month: string,
  spentByMonth: ReadonlyMap<string, number>,
): number {
  if (!budget.rollover) return 0;
  const target = monthIndex(month);
  const anchor = monthIndex(budget.carryFromMonth);
  // The frozen balance is what was carried *into* the anchor month, so it
  // applies from the anchor onward. Earlier months predate this budget's
  // current settings entirely and have no carry to show.
  if (target < anchor) return 0;
  if (target === anchor) return budget.carryFromCents;
  // Bound the walk; if the anchor is older than the window, its frozen
  // balance falls outside what we replay and the window starts flat.
  const earliest = Math.max(anchor, target - ROLLOVER_MAX_MONTHS);
  let carry = earliest === anchor ? budget.carryFromCents : 0;
  for (let i = earliest; i < target; i++) {
    const m = monthFromIndex(i);
    carry = budget.amountCents + carry - (spentByMonth.get(m) ?? 0);
  }
  return carry;
}

/**
 * Progress for one budget in one month. `spentByMonth` maps YYYY-MM to the
 * cents spent in that budget's category.
 *
 * Assumes the budget applies to the month: check `hasStarted` first, and
 * treat spend from before a budget existed as unbudgeted rather than as an
 * overspend against a limit that was not yet set.
 */
export function budgetProgress(
  budget: Budget,
  month: string,
  spentByMonth: ReadonlyMap<string, number> = new Map(),
): BudgetProgress {
  const spentCents = spentByMonth.get(month) ?? 0;
  const baseAmountCents = budget.amountCents;
  const rolloverCents = rolloverInto(budget, month, spentByMonth);
  const availableCents = baseAmountCents + rolloverCents;
  const remainingCents = availableCents - spentCents;
  const ratio = availableCents > 0 ? spentCents / availableCents : spentCents > 0 ? 1 : 0;
  return {
    category: budget.category,
    month,
    baseAmountCents,
    rolloverCents,
    availableCents,
    spentCents,
    remainingCents,
    ratio,
    status: statusOf(remainingCents, ratio),
    rollover: budget.rollover,
  };
}

/** Roll per-category progress up into the month's headline numbers. */
export function summarize(
  month: string,
  budgets: BudgetProgress[],
  unbudgetedCents: number,
): BudgetSummary {
  let totalAvailableCents = 0;
  let totalSpentCents = 0;
  let overCount = 0;
  for (const b of budgets) {
    totalAvailableCents += b.availableCents;
    totalSpentCents += b.spentCents;
    if (b.status === 'over') overCount++;
  }
  return {
    month,
    budgets: [...budgets].sort((a, b) => a.category.localeCompare(b.category)),
    totalAvailableCents,
    totalSpentCents,
    totalRemainingCents: totalAvailableCents - totalSpentCents,
    unbudgetedCents,
    overCount,
  };
}
