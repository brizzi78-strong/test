/**
 * AccountingService — orchestration for small-business bookkeeping.
 *
 * Responsibilities:
 *   - manage companies, a chart of accounts, and customers
 *   - build invoices (line items + tax) as drafts, issue them, take payments
 *     against them, and void them — with balances kept in integer cents
 *   - log expenses against expense accounts
 *   - read two reports out of the books: profit & loss over a period, and an
 *     accounts-receivable aging as of a date
 *
 * The clock and id generator are injected so the lifecycle is deterministic
 * under test. Money is handled in integer cents to avoid float drift.
 */

import { randomUUID } from 'node:crypto';
import type {
  Account,
  AccountType,
  Company,
  Customer,
  Expense,
  Invoice,
  InvoiceEvent,
  InvoiceLine,
  InvoiceStatus,
  Payment,
} from '../domain/types.ts';
import { ACCOUNT_TYPES } from '../domain/types.ts';
import {
  agingBucket,
  canTransition,
  computeTotals,
  daysBetween,
  lineAmountCents,
  type AgingBucket,
} from '../domain/workflow.ts';
import type { Collection, Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LineInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface ProfitAndLoss {
  companyId: string;
  from: string | null;
  to: string | null;
  income: ReportGroup;
  expenses: ReportGroup;
  netCents: number;
}

export interface ReportGroup {
  lines: Array<{ accountId: string | null; name: string; amountCents: number }>;
  totalCents: number;
}

export interface AgingRow {
  invoiceId: string;
  number?: string;
  customerId: string;
  dueDate?: string;
  balanceCents: number;
  daysPastDue: number;
  bucket: AgingBucket;
}

export interface ArAging {
  companyId: string;
  asOf: string;
  buckets: Record<AgingBucket, number>;
  totalCents: number;
  invoices: AgingRow[];
}

export class AccountingService {
  private readonly store: Store;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  // --- Companies ---------------------------------------------------------

  createCompany(input: { name: string }): Company {
    const company: Company = {
      id: this.newId('co'),
      name: requireString(input.name, 'name'),
      createdAt: this.timestamp(),
    };
    this.store.companies.put(company);
    return company;
  }

  // --- Chart of accounts -------------------------------------------------

  createAccount(input: { companyId: string; type: AccountType; name: string; code?: string }): Account {
    this.requireCompany(input.companyId);
    if (!ACCOUNT_TYPES.includes(input.type)) {
      throw new ValidationError(`unknown account type: ${String(input.type)}`);
    }
    const account: Account = {
      id: this.newId('acct'),
      companyId: input.companyId,
      type: input.type,
      name: requireString(input.name, 'name'),
      code: optionalString(input.code),
      createdAt: this.timestamp(),
    };
    this.store.accounts.put(account);
    return account;
  }

  getAccount(id: string): Account {
    return this.require(this.store.accounts, 'Account', id);
  }

  listAccounts(filter?: { companyId?: string; type?: AccountType }): Account[] {
    return this.store.accounts.list((a) => {
      if (filter?.companyId && a.companyId !== filter.companyId) return false;
      if (filter?.type && a.type !== filter.type) return false;
      return true;
    });
  }

  // --- Customers ---------------------------------------------------------

  createCustomer(input: { companyId: string; name: string; email?: string }): Customer {
    this.requireCompany(input.companyId);
    const email = optionalString(input.email);
    if (email !== undefined && !EMAIL_RE.test(email)) {
      throw new ValidationError(`email is not a valid address: ${email}`);
    }
    const customer: Customer = {
      id: this.newId('cust'),
      companyId: input.companyId,
      name: requireString(input.name, 'name'),
      email,
      createdAt: this.timestamp(),
    };
    this.store.customers.put(customer);
    return customer;
  }

  getCustomer(id: string): Customer {
    return this.require(this.store.customers, 'Customer', id);
  }

  listCustomers(filter?: { companyId?: string }): Customer[] {
    return this.store.customers.list((c) => !filter?.companyId || c.companyId === filter.companyId);
  }

  // --- Invoices ----------------------------------------------------------

  createInvoice(input: {
    companyId: string;
    customerId: string;
    lines: LineInput[];
    taxRateBps?: number;
    incomeAccountId?: string;
    dueDate?: string;
  }): Invoice {
    const company = this.requireCompany(input.companyId);
    const customer = this.require(this.store.customers, 'Customer', input.customerId);
    if (customer.companyId !== company.id) {
      throw new ValidationError('customer does not belong to company');
    }
    const taxRateBps = this.validateTaxRate(input.taxRateBps);
    const lines = this.validateLines(input.lines);
    if (input.incomeAccountId !== undefined) {
      this.requireAccountOfType(input.incomeAccountId, company.id, 'income');
    }
    const totals = computeTotals(lines, taxRateBps);
    const ts = this.timestamp();
    const invoice: Invoice = {
      id: this.newId('inv'),
      companyId: company.id,
      customerId: customer.id,
      status: 'draft',
      lines,
      taxRateBps,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      amountPaidCents: 0,
      balanceCents: totals.totalCents,
      incomeAccountId: input.incomeAccountId,
      dueDate: optionalString(input.dueDate),
      payments: [],
      history: [{ at: ts, event: 'created' }],
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.invoices.put(invoice);
    return invoice;
  }

  getInvoice(id: string): Invoice {
    return this.require(this.store.invoices, 'Invoice', id);
  }

  listInvoices(filter?: { companyId?: string; customerId?: string; status?: InvoiceStatus }): Invoice[] {
    return this.store.invoices.list((i) => {
      if (filter?.companyId && i.companyId !== filter.companyId) return false;
      if (filter?.customerId && i.customerId !== filter.customerId) return false;
      if (filter?.status && i.status !== filter.status) return false;
      return true;
    });
  }

  /** Edit a draft's lines, tax rate, income account, or due date. */
  updateDraft(
    invoiceId: string,
    input: { lines?: LineInput[]; taxRateBps?: number; incomeAccountId?: string; dueDate?: string },
  ): Invoice {
    const invoice = this.getInvoice(invoiceId);
    if (invoice.status !== 'draft') {
      throw new ConflictError(`only a 'draft' invoice can be edited (is '${invoice.status}')`);
    }
    if (input.lines !== undefined) invoice.lines = this.validateLines(input.lines);
    if (input.taxRateBps !== undefined) invoice.taxRateBps = this.validateTaxRate(input.taxRateBps);
    if (input.incomeAccountId !== undefined) {
      this.requireAccountOfType(input.incomeAccountId, invoice.companyId, 'income');
      invoice.incomeAccountId = input.incomeAccountId;
    }
    if (input.dueDate !== undefined) invoice.dueDate = optionalString(input.dueDate);
    this.recomputeTotals(invoice);
    this.record(invoice, { event: 'edited' });
    return this.save(invoice);
  }

  /** Issue a draft: assign a number, move it to `open`, and start owing. */
  issueInvoice(invoiceId: string, input: { issueDate?: string } = {}): Invoice {
    const invoice = this.getInvoice(invoiceId);
    if (invoice.status !== 'draft') {
      throw new ConflictError(`only a 'draft' invoice can be issued (is '${invoice.status}')`);
    }
    if (invoice.lines.length === 0 || invoice.totalCents <= 0) {
      throw new ConflictError('add at least one line with a positive total before issuing');
    }
    this.transition(invoice, 'open');
    invoice.issueDate = optionalString(input.issueDate) ?? this.timestamp();
    invoice.number = this.nextInvoiceNumber(invoice.companyId);
    this.record(invoice, { event: 'issued', note: invoice.number });
    return this.save(invoice);
  }

  /** Record a payment against an open invoice; auto-marks it paid when settled. */
  recordPayment(
    invoiceId: string,
    input: { amountCents: number; method?: string; memo?: string; receivedAt?: string },
  ): Invoice {
    const invoice = this.getInvoice(invoiceId);
    if (invoice.status !== 'open') {
      throw new ConflictError(`payments apply only to an 'open' invoice (is '${invoice.status}')`);
    }
    const amountCents = requirePositiveCents(input.amountCents, 'amountCents');
    if (amountCents > invoice.balanceCents) {
      throw new ValidationError(
        `payment ${amountCents} exceeds outstanding balance ${invoice.balanceCents}`,
      );
    }
    const payment: Payment = {
      id: this.newId('pay'),
      amountCents,
      receivedAt: optionalString(input.receivedAt) ?? this.timestamp(),
      method: optionalString(input.method),
      memo: optionalString(input.memo),
    };
    invoice.payments.push(payment);
    invoice.amountPaidCents += amountCents;
    invoice.balanceCents = invoice.totalCents - invoice.amountPaidCents;
    this.record(invoice, { event: 'payment', note: String(amountCents) });
    if (invoice.balanceCents === 0) {
      this.transition(invoice, 'paid');
      this.record(invoice, { event: 'paid' });
    }
    return this.save(invoice);
  }

  /** Void a draft or open invoice (terminal). */
  voidInvoice(invoiceId: string, input: { reason?: string } = {}): Invoice {
    const invoice = this.getInvoice(invoiceId);
    if (!canTransition(invoice.status, 'void')) {
      throw new ConflictError(`a '${invoice.status}' invoice can't be voided`);
    }
    this.transition(invoice, 'void');
    invoice.balanceCents = 0;
    this.record(invoice, { event: 'voided', note: optionalString(input.reason) });
    return this.save(invoice);
  }

  // --- Expenses ----------------------------------------------------------

  recordExpense(input: {
    companyId: string;
    vendor: string;
    accountId: string;
    amountCents: number;
    date: string;
    memo?: string;
  }): Expense {
    const company = this.requireCompany(input.companyId);
    this.requireAccountOfType(input.accountId, company.id, 'expense');
    const expense: Expense = {
      id: this.newId('exp'),
      companyId: company.id,
      vendor: requireString(input.vendor, 'vendor'),
      accountId: input.accountId,
      amountCents: requirePositiveCents(input.amountCents, 'amountCents'),
      date: requireString(input.date, 'date'),
      memo: optionalString(input.memo),
      createdAt: this.timestamp(),
    };
    this.store.expenses.put(expense);
    return expense;
  }

  getExpense(id: string): Expense {
    return this.require(this.store.expenses, 'Expense', id);
  }

  listExpenses(filter?: { companyId?: string; accountId?: string }): Expense[] {
    return this.store.expenses.list((e) => {
      if (filter?.companyId && e.companyId !== filter.companyId) return false;
      if (filter?.accountId && e.accountId !== filter.accountId) return false;
      return true;
    });
  }

  // --- Reports -----------------------------------------------------------

  /**
   * Profit & loss for a company over an optional [from, to] window (inclusive,
   * compared on calendar day). Income is recognized from issued invoices by
   * issue date; expenses by their date. Both are grouped by account.
   */
  profitAndLoss(input: { companyId: string; from?: string; to?: string }): ProfitAndLoss {
    const company = this.requireCompany(input.companyId);
    const from = optionalString(input.from) ?? null;
    const to = optionalString(input.to) ?? null;

    const incomeByAccount = new Map<string | null, number>();
    for (const inv of this.store.invoices.list()) {
      if (inv.companyId !== company.id) continue;
      if (inv.status !== 'open' && inv.status !== 'paid') continue;
      const when = inv.issueDate;
      if (!when || !inDayRange(when, from, to)) continue;
      const key = inv.incomeAccountId ?? null;
      incomeByAccount.set(key, (incomeByAccount.get(key) ?? 0) + inv.totalCents);
    }

    const expenseByAccount = new Map<string | null, number>();
    for (const exp of this.store.expenses.list()) {
      if (exp.companyId !== company.id) continue;
      if (!inDayRange(exp.date, from, to)) continue;
      expenseByAccount.set(exp.accountId, (expenseByAccount.get(exp.accountId) ?? 0) + exp.amountCents);
    }

    const income = this.groupToReport(incomeByAccount);
    const expenses = this.groupToReport(expenseByAccount);
    return {
      companyId: company.id,
      from,
      to,
      income,
      expenses,
      netCents: income.totalCents - expenses.totalCents,
    };
  }

  /**
   * Accounts-receivable aging: every open invoice with a balance, bucketed by
   * how far past its due date it is as of `asOf` (default: now).
   */
  accountsReceivable(input: { companyId: string; asOf?: string }): ArAging {
    const company = this.requireCompany(input.companyId);
    const asOf = optionalString(input.asOf) ?? this.timestamp();
    const buckets: Record<AgingBucket, number> = {
      current: 0,
      d1_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    };
    const rows: AgingRow[] = [];
    let totalCents = 0;
    for (const inv of this.store.invoices.list()) {
      if (inv.companyId !== company.id) continue;
      if (inv.status !== 'open' || inv.balanceCents <= 0) continue;
      const reference = inv.dueDate ?? inv.issueDate ?? inv.createdAt;
      const daysPastDue = daysBetween(reference, asOf);
      const bucket = agingBucket(daysPastDue);
      buckets[bucket] += inv.balanceCents;
      totalCents += inv.balanceCents;
      rows.push({
        invoiceId: inv.id,
        number: inv.number,
        customerId: inv.customerId,
        dueDate: inv.dueDate,
        balanceCents: inv.balanceCents,
        daysPastDue,
        bucket,
      });
    }
    return { companyId: company.id, asOf, buckets, totalCents, invoices: rows };
  }

  // --- internals ---------------------------------------------------------

  private groupToReport(byAccount: Map<string | null, number>): ReportGroup {
    const lines = [...byAccount.entries()].map(([accountId, amountCents]) => ({
      accountId,
      name: accountId ? this.store.accounts.get(accountId)?.name ?? accountId : 'Unassigned',
      amountCents,
    }));
    lines.sort((a, b) => a.name.localeCompare(b.name));
    return { lines, totalCents: lines.reduce((sum, l) => sum + l.amountCents, 0) };
  }

  private recomputeTotals(invoice: Invoice): void {
    const totals = computeTotals(invoice.lines, invoice.taxRateBps);
    invoice.subtotalCents = totals.subtotalCents;
    invoice.taxCents = totals.taxCents;
    invoice.totalCents = totals.totalCents;
    invoice.balanceCents = totals.totalCents - invoice.amountPaidCents;
  }

  private nextInvoiceNumber(companyId: string): string {
    const issued = this.store.invoices.list(
      (i) => i.companyId === companyId && typeof i.number === 'string',
    ).length;
    return `INV-${String(issued + 1).padStart(4, '0')}`;
  }

  private validateLines(lines: LineInput[]): InvoiceLine[] {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new ValidationError('lines must be a non-empty array');
    }
    return lines.map((l, i) => {
      const description = requireString(l?.description, `lines[${i}].description`);
      const quantity = l?.quantity;
      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError(`lines[${i}].quantity must be a positive number`);
      }
      const unitPriceCents = l?.unitPriceCents;
      if (typeof unitPriceCents !== 'number' || !Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
        throw new ValidationError(`lines[${i}].unitPriceCents must be a non-negative integer`);
      }
      return {
        description,
        quantity,
        unitPriceCents,
        amountCents: lineAmountCents(quantity, unitPriceCents),
      };
    });
  }

  private validateTaxRate(taxRateBps: number | undefined): number {
    if (taxRateBps === undefined) return 0;
    if (typeof taxRateBps !== 'number' || !Number.isInteger(taxRateBps) || taxRateBps < 0) {
      throw new ValidationError('taxRateBps must be a non-negative integer (basis points)');
    }
    return taxRateBps;
  }

  private requireAccountOfType(accountId: string, companyId: string, type: AccountType): Account {
    const account = this.require(this.store.accounts, 'Account', accountId);
    if (account.companyId !== companyId) {
      throw new ValidationError('account does not belong to company');
    }
    if (account.type !== type) {
      throw new ValidationError(`account ${accountId} is not an ${type} account`);
    }
    return account;
  }

  private transition(invoice: Invoice, to: InvoiceStatus): void {
    if (!canTransition(invoice.status, to)) {
      throw new ConflictError(`illegal transition '${invoice.status}' -> '${to}'`);
    }
    invoice.status = to;
  }

  private record(invoice: Invoice, meta: Omit<InvoiceEvent, 'at'>): void {
    invoice.history.push({ at: this.timestamp(), ...meta });
  }

  private save(invoice: Invoice): Invoice {
    invoice.updatedAt = this.timestamp();
    this.store.invoices.put(invoice);
    return invoice;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private requireCompany(id: string): Company {
    return this.require(this.store.companies, 'Company', id);
  }

  private require<T>(collection: Collection<T>, what: string, id: string): T {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError(`${what} id is required`);
    }
    const found = collection.get(id);
    if (!found) throw new NotFoundError(what, id);
    return found;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('expected a string');
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requirePositiveCents(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive integer (cents)`);
  }
  return value;
}

/** Inclusive calendar-day range test; ISO date strings sort chronologically. */
function inDayRange(when: string, from: string | null, to: string | null): boolean {
  const day = when.slice(0, 10);
  if (from && day < from.slice(0, 10)) return false;
  if (to && day > to.slice(0, 10)) return false;
  return true;
}
