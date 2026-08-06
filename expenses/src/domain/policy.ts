/**
 * The policy engine — the part that makes this better than Concur. Every
 * expense is evaluated the moment it is entered, so the filer sees exactly
 * what will block or flag the report before submitting, and fully compliant
 * reports under the ceiling are approved instantly with no human in the loop.
 */

import type {
  Category,
  Expense,
  ExpenseReport,
  PolicyEvaluation,
  Violation,
} from './types.ts';

export interface Policy {
  /** Receipts are required for any expense at or above this amount. */
  receiptRequiredCents: number;
  /** Per-expense caps by category; categories absent here are uncapped. */
  categoryLimitCents: Partial<Record<Category, number>>;
  /** IRS standard mileage rate, in cents per mile. */
  mileageRateCentsPerMile: number;
  /** Compliant reports totalling at most this are approved automatically. */
  autoApproveCeilingCents: number;
  /** Expenses older than this many days at submission are flagged. */
  staleAfterDays: number;
}

/** 2025 defaults: IRS mileage rate 70¢/mile; receipts required from $25. */
export const DEFAULT_POLICY: Policy = {
  receiptRequiredCents: 2_500,
  categoryLimitCents: {
    meals: 7_500,
    lodging: 35_000,
    ground_transport: 15_000,
    entertainment: 10_000,
  },
  mileageRateCentsPerMile: 70,
  autoApproveCeilingCents: 20_000,
  staleAfterDays: 90,
};

export function mileageAmountCents(miles: number, policy: Policy = DEFAULT_POLICY): number {
  return Math.round(miles * policy.mileageRateCentsPerMile);
}

export function reportTotalCents(report: ExpenseReport): number {
  return report.expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/** Key used to spot the same purchase entered twice. */
const duplicateKey = (e: Expense): string =>
  `${e.date}|${e.merchant.trim().toLowerCase()}|${e.amountCents}`;

function expenseViolations(e: Expense, policy: Policy, today: string): Violation[] {
  const violations: Violation[] = [];
  if (e.amountCents >= policy.receiptRequiredCents && !e.receipt && e.category !== 'mileage') {
    violations.push({
      expenseId: e.id,
      code: 'MISSING_RECEIPT',
      message: `Receipt required for expenses of ${dollars(policy.receiptRequiredCents)} or more`,
    });
  }
  const limit = policy.categoryLimitCents[e.category];
  if (limit !== undefined && e.amountCents > limit) {
    violations.push({
      expenseId: e.id,
      code: 'OVER_CATEGORY_LIMIT',
      message: `${dollars(e.amountCents)} exceeds the ${dollars(limit)} limit for ${e.category}`,
    });
  }
  if (e.date > today) {
    violations.push({ expenseId: e.id, code: 'FUTURE_DATE', message: 'Expense is dated in the future' });
  }
  const staleBefore = new Date(Date.parse(today) - policy.staleAfterDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (e.date < staleBefore) {
    violations.push({
      expenseId: e.id,
      code: 'STALE_EXPENSE',
      message: `Expense is older than ${policy.staleAfterDays} days`,
    });
  }
  return violations;
}

/**
 * Evaluate a report against policy. `otherExpenses` are the owner's expenses
 * from every other report, used for cross-report duplicate detection.
 *
 * @param today ISO date (YYYY-MM-DD) used for future/stale checks.
 */
export function evaluateReport(
  report: ExpenseReport,
  otherExpenses: Expense[] = [],
  policy: Policy = DEFAULT_POLICY,
  today: string = new Date().toISOString().slice(0, 10),
): PolicyEvaluation {
  const violations: Violation[] = [];
  const seen = new Map<string, string>();
  for (const other of otherExpenses) seen.set(duplicateKey(other), 'another report');

  for (const e of report.expenses) {
    violations.push(...expenseViolations(e, policy, today));
    const key = duplicateKey(e);
    const where = seen.get(key);
    if (where) {
      violations.push({
        expenseId: e.id,
        code: 'DUPLICATE',
        message: `Possible duplicate: ${e.merchant} for ${dollars(e.amountCents)} on ${e.date} also appears in ${where}`,
      });
    } else {
      seen.set(key, 'this report');
    }
  }

  const totalCents = reportTotalCents(report);
  return {
    totalCents,
    violations,
    autoApprovable: violations.length === 0 && totalCents <= policy.autoApproveCeilingCents,
  };
}
