/**
 * Core domain types for the Accounting module — small-business bookkeeping.
 *
 * The shape of a lightweight "books" system: a company keeps a chart of
 * accounts, bills customers with invoices (line items + tax), records the
 * payments that come in against them, logs expenses against expense accounts,
 * and reads two reports out of it all — a profit & loss and an accounts-
 * receivable aging. Money is always whole cents (integers) to avoid float
 * drift; every invoice carries an append-only history.
 *
 * String-literal unions (not TS enums) keep the source runnable directly under
 * Node's type stripping with no build step.
 */

/** The five classic account classes on a chart of accounts. */
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export const ACCOUNT_TYPES: readonly AccountType[] = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
];

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Account {
  id: string;
  companyId: string;
  type: AccountType;
  name: string;
  /** Optional short code, e.g. "4000" for a revenue account. */
  code?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  createdAt: string;
}

/** One billable line on an invoice; `amountCents` is quantity × unitPriceCents. */
export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

/**
 * Lifecycle of an invoice:
 * - `draft` – being built; freely editable, not yet owed
 * - `open`  – issued to the customer; awaiting (or partway through) payment
 * - `paid`  – fully paid (terminal)
 * - `void`  – cancelled (terminal)
 *
 * "Overdue" is not a stored status — it is derived from `dueDate` versus the
 * date a report is run.
 */
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void';

export const INVOICE_STATUSES: readonly InvoiceStatus[] = ['draft', 'open', 'paid', 'void'];

export interface Payment {
  id: string;
  amountCents: number;
  receivedAt: string;
  method?: string;
  memo?: string;
}

export interface InvoiceEvent {
  at: string;
  /** e.g. 'created', 'edited', 'issued', 'payment', 'paid', 'voided'. */
  event: string;
  by?: string;
  note?: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string;
  /** Human-facing number, e.g. "INV-0007"; assigned when issued. */
  number?: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  /** Sales-tax rate in basis points (e.g. 725 = 7.25%). */
  taxRateBps: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents: number;
  balanceCents: number;
  /** The income account this invoice's revenue posts to (for the P&L). */
  incomeAccountId?: string;
  issueDate?: string;
  dueDate?: string;
  payments: Payment[];
  history: InvoiceEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  companyId: string;
  vendor: string;
  /** The expense account this hits (must be an `expense`-type account). */
  accountId: string;
  amountCents: number;
  /** Date the expense was incurred (ISO). */
  date: string;
  memo?: string;
  createdAt: string;
}
