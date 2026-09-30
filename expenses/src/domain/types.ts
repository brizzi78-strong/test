/**
 * Core domain types for expense reporting. All monetary amounts are integer
 * cents (USD) to keep arithmetic exact.
 */

export const CATEGORIES = [
  'meals',
  'lodging',
  'airfare',
  'ground_transport',
  'mileage',
  'office_supplies',
  'software',
  'entertainment',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';

export interface Receipt {
  /** Display name, e.g. the uploaded filename. */
  name: string;
  /** data: URL (image/* or application/pdf) holding the attachment itself. */
  dataUrl?: string;
  /** Set in list views in place of dataUrl so payloads stay small. */
  hasData?: boolean;
}

export interface Expense {
  id: string;
  /** ISO date (YYYY-MM-DD) the expense was incurred. */
  date: string;
  category: Category;
  merchant: string;
  description: string;
  /** Integer cents. For mileage this is computed from `miles` at the IRS rate. */
  amountCents: number;
  /** Only present for category "mileage". */
  miles?: number;
  /** Attached receipt, when one is on file. */
  receipt?: Receipt;
  /** How it was paid: company card charges are not reimbursed to the filer. */
  paymentMethod?: 'personal' | 'card';
  /** Set when this expense is matched to a corporate card charge. */
  cardTransactionId?: string;
}

export type CardTransactionStatus = 'unmatched' | 'matched' | 'dismissed';

/** One charge from the corporate card feed. */
export interface CardTransaction {
  id: string;
  /** Cardholder (same lightweight tenancy as reports). */
  ownerId: string;
  /** ISO date (YYYY-MM-DD) the charge posted. */
  date: string;
  merchant: string;
  amountCents: number;
  /** Last four digits of the card, for display. */
  last4: string;
  status: CardTransactionStatus;
  /** Set while status is "matched". */
  expenseId?: string;
  reportId?: string;
}

export interface HistoryEntry {
  at: string;
  by: string;
  action: string;
  note?: string;
}

export interface ExpenseReport {
  id: string;
  ownerId: string;
  /** User id whose approval queue this report lands in when not auto-approved. */
  approverId: string;
  title: string;
  status: ReportStatus;
  expenses: Expense[];
  createdAt: string;
  submittedAt?: string;
  decidedAt?: string;
  reimbursedAt?: string;
  /** True when the policy engine approved the report without a human. */
  autoApproved?: boolean;
  rejectionReason?: string;
  history: HistoryEntry[];
}

/** A monthly spending limit for one category, Mint-style. */
export interface Budget {
  /** Deterministic `${ownerId}|${category}` — one budget per category. */
  id: string;
  ownerId: string;
  category: Category;
  /** Monthly limit in integer cents. */
  amountCents: number;
  /** First month the budget applies (YYYY-MM). */
  startMonth: string;
  /** Carry the month's unused (or overspent) balance into the next month. */
  rollover: boolean;
  /**
   * Month rollover accumulates from. Reset whenever the limit or the rollover
   * flag changes, so changing a budget never rewrites earlier months.
   */
  carryFromMonth: string;
  /** Balance carried into `carryFromMonth`, frozen at that reset. */
  carryFromCents: number;
  createdAt: string;
}

export type BudgetStatus = 'under' | 'warning' | 'over';

export interface BudgetProgress {
  category: Category;
  month: string;
  /** The plain monthly limit, before any rollover. */
  baseAmountCents: number;
  /** Signed balance carried in from earlier months; 0 when rollover is off. */
  rolloverCents: number;
  /** What may be spent this month: base + rollover. Can go negative. */
  availableCents: number;
  spentCents: number;
  /** available − spent; negative means over budget. */
  remainingCents: number;
  /** spent / available, for the progress bar. */
  ratio: number;
  status: BudgetStatus;
  rollover: boolean;
}

export interface BudgetSummary {
  month: string;
  budgets: BudgetProgress[];
  totalAvailableCents: number;
  totalSpentCents: number;
  totalRemainingCents: number;
  /** Spend this month in categories with no budget set. */
  unbudgetedCents: number;
  overCount: number;
}

export type ViolationCode =
  | 'MISSING_RECEIPT'
  | 'OVER_CATEGORY_LIMIT'
  | 'FUTURE_DATE'
  | 'STALE_EXPENSE'
  | 'DUPLICATE';

export interface Violation {
  expenseId: string;
  code: ViolationCode;
  message: string;
}

export interface PolicyEvaluation {
  totalCents: number;
  /** Total minus company-card charges: what the filer is actually owed. */
  reimbursableCents: number;
  violations: Violation[];
  /** Compliant and under the auto-approve ceiling: no human review needed. */
  autoApprovable: boolean;
}
