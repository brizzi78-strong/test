/**
 * Application service: report lifecycle (draft → submitted → approved/rejected
 * → reimbursed), expense CRUD with validation, instant policy evaluation, and
 * spend analytics. Auto-approval happens at submit time: a compliant report
 * under the policy ceiling never waits on a human.
 */

import { randomUUID } from 'node:crypto';
import {
  DEFAULT_POLICY,
  evaluateReport,
  mileageAmountCents,
  reportTotalCents,
  type Policy,
} from '../domain/policy.ts';
import { findMatchingTransaction } from '../domain/matching.ts';
import {
  CATEGORIES,
  type CardTransaction,
  type CardTransactionStatus,
  type Category,
  type Expense,
  type ExpenseReport,
  type PolicyEvaluation,
  type Receipt,
} from '../domain/types.ts';
import type { Store } from '../store/store.ts';
import { DomainError, conflict, forbidden, notFound } from './errors.ts';

export interface ReportWithEvaluation {
  report: ExpenseReport;
  evaluation: PolicyEvaluation;
}

export interface Analytics {
  reportCount: number;
  totalCents: number;
  /** Out-of-pocket spend owed back to the filer (total minus card charges). */
  reimbursableCents: number;
  /** Company-card spend inside reports. */
  cardCents: number;
  byCategory: Partial<Record<Category, number>>;
  byStatus: Record<string, number>;
  autoApprovedCount: number;
  violationCount: number;
  /** Card charges still waiting to be expensed or dismissed. */
  unmatchedTransactionCount: number;
}

export interface ImportResult {
  imported: CardTransaction[];
  /** Charges skipped because an identical one was already in the feed. */
  duplicateCount: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Anchored end to end: the payload may contain only base64 characters, so a
 * stored value can never smuggle HTML/attribute metacharacters to a viewer.
 */
const RECEIPT_DATA_URL = /^data:(image\/[\w.+-]+|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/;
/** ~500 KB of base64 — keeps report documents and payloads bounded. */
const RECEIPT_MAX_CHARS = 700_000;

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new DomainError('request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

function requireString(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainError(`${field} is required`);
  }
  if (value.length > maxLength) throw new DomainError(`${field} is too long`);
  return value.trim();
}

/**
 * Accept a receipt as either a bare name (kept for API ergonomics) or a
 * `{ name, dataUrl }` attachment. Attachments must be image or PDF data:
 * URLs and are capped so a single report stays a reasonable payload.
 */
function parseReceipt(value: unknown, existing?: Receipt): Receipt | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') {
    return value.trim() ? { name: value.trim().slice(0, 200) } : undefined;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('receipt must be a filename or { name, dataUrl }');
  }
  const input = value as Record<string, unknown>;
  const name = requireString(input.name, 'receipt.name');
  if (input.dataUrl === undefined || input.dataUrl === null || input.dataUrl === '') {
    // A list-view receipt ({ name, hasData: true }) round-tripped back through
    // an update means "keep the stored attachment", not "drop it".
    if (input.hasData === true && existing?.dataUrl) return { name, dataUrl: existing.dataUrl };
    return { name };
  }
  if (typeof input.dataUrl !== 'string') {
    throw new DomainError('receipt.dataUrl must be a base64 image or PDF data: URL');
  }
  if (input.dataUrl.length > RECEIPT_MAX_CHARS) {
    throw new DomainError('receipt attachment is too large (max ~500 KB)');
  }
  if (!RECEIPT_DATA_URL.test(input.dataUrl)) {
    throw new DomainError('receipt.dataUrl must be a base64 image or PDF data: URL');
  }
  return { name, dataUrl: input.dataUrl };
}

/** Pre-attachment documents stored receipts as bare strings; normalize on read. */
function normalizeReport(report: ExpenseReport): ExpenseReport {
  for (const e of report.expenses) {
    const receipt = e.receipt as unknown;
    if (typeof receipt === 'string') {
      e.receipt = receipt.trim() ? { name: receipt.trim() } : undefined;
    }
  }
  return report;
}

/** Replace receipt attachment bytes with a `hasData` marker for list payloads. */
function stripReceiptData(report: ExpenseReport): ExpenseReport {
  return {
    ...report,
    expenses: report.expenses.map((e) =>
      e.receipt?.dataUrl ? { ...e, receipt: { name: e.receipt.name, hasData: true } } : e,
    ),
  };
}

/** Identity of a charge for re-import dedupe. */
const transactionKey = (t: Pick<CardTransaction, 'date' | 'merchant' | 'amountCents' | 'last4'>): string =>
  `${t.date}|${t.merchant.trim().toLowerCase()}|${t.amountCents}|${t.last4}`;

const csvCell = (value: string | number): string => {
  let s = String(value);
  // Neutralize spreadsheet formula injection: =, +, -, @ prefixes are
  // evaluated by Excel/Sheets, so escape them with a leading apostrophe.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export class ExpenseService {
  readonly policy: Policy;
  private readonly store: Store;
  private readonly now: () => Date;

  constructor(opts: { store: Store; policy?: Policy; now?: () => Date }) {
    this.store = opts.store;
    this.policy = opts.policy ?? DEFAULT_POLICY;
    this.now = opts.now ?? (() => new Date());
  }

  private today(): string {
    return this.now().toISOString().slice(0, 10);
  }

  createReport(userId: string, body: unknown): ReportWithEvaluation {
    const input = asRecord(body);
    const report: ExpenseReport = {
      id: randomUUID(),
      ownerId: userId,
      approverId: input.approverId === undefined ? 'manager' : requireString(input.approverId, 'approverId'),
      title: requireString(input.title, 'title'),
      status: 'draft',
      expenses: [],
      createdAt: this.now().toISOString(),
      history: [{ at: this.now().toISOString(), by: userId, action: 'created' }],
    };
    this.store.put(report);
    return this.withEvaluation(report);
  }

  /** List views strip receipt attachment bytes; fetch one report for the full data. */
  listReports(userId: string): ReportWithEvaluation[] {
    // One store read for the whole list: each report is evaluated against the
    // same pre-fetched set instead of re-querying the store per report.
    const mine = this.query((r) => r.ownerId === userId);
    return mine
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ report: stripReceiptData(r), evaluation: this.evaluateAgainst(r, mine) }));
  }

  /** Reports waiting on this user's approval, oldest submission first. */
  listApprovals(userId: string): ReportWithEvaluation[] {
    return this.query((r) => r.status === 'submitted' && r.approverId === userId)
      .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
      .map((r) => ({ report: stripReceiptData(r), evaluation: this.evaluate(r) }));
  }

  /** Approved reports this user can mark reimbursed, oldest decision first. */
  listReimbursable(userId: string): ReportWithEvaluation[] {
    return this.query((r) => r.status === 'approved' && r.approverId === userId)
      .sort((a, b) => (a.decidedAt ?? '').localeCompare(b.decidedAt ?? ''))
      .map((r) => ({ report: stripReceiptData(r), evaluation: this.evaluate(r) }));
  }

  getReport(userId: string, id: string): ReportWithEvaluation {
    return this.withEvaluation(this.ownedOrReviewed(userId, id));
  }

  deleteReport(userId: string, id: string): void {
    const report = this.owned(userId, id);
    if (report.status !== 'draft') throw conflict('only draft reports can be deleted');
    for (const expense of report.expenses) {
      if (expense.cardTransactionId) this.unlinkTransaction(expense.cardTransactionId);
    }
    this.store.delete(id);
  }

  addExpense(userId: string, reportId: string, body: unknown): ReportWithEvaluation {
    const report = this.editable(userId, reportId);
    const expense = this.parseExpense(body, randomUUID());
    const matched = this.autoMatch(report, expense);
    report.expenses.push(expense);
    this.store.put(report);
    if (matched) this.store.putTransaction(matched);
    return this.withEvaluation(report);
  }

  /**
   * Card links are server-derived, never client state: any edit unlinks the
   * old charge and re-runs matching against the freshly validated fields, so
   * a stored link always satisfies the matching rules. An unlink that does
   * not re-match is recorded in the report history for the approver.
   */
  updateExpense(userId: string, reportId: string, expenseId: string, body: unknown): ReportWithEvaluation {
    const report = this.editable(userId, reportId);
    const index = report.expenses.findIndex((e) => e.id === expenseId);
    if (index === -1) throw notFound('expense');
    const previous = report.expenses[index]!;
    const next = this.parseExpense(body, expenseId, previous);
    if (previous.cardTransactionId) {
      this.unlinkTransaction(previous.cardTransactionId);
      // A client-sent 'card' here is a round-tripped copy of the old link's
      // flag, not a fresh declaration — drop it so matching decides.
      if (next.paymentMethod === 'card') delete next.paymentMethod;
    }
    const matched = this.autoMatch(report, next);
    if (previous.cardTransactionId && matched?.id !== previous.cardTransactionId) {
      report.history.push({
        at: this.now().toISOString(),
        by: userId,
        action: 'card-unlinked',
        note: `${previous.merchant} $${(previous.amountCents / 100).toFixed(2)} edited; its card charge returned to the feed`,
      });
    }
    report.expenses[index] = next;
    this.store.put(report);
    if (matched) this.store.putTransaction(matched);
    return this.withEvaluation(report);
  }

  deleteExpense(userId: string, reportId: string, expenseId: string): ReportWithEvaluation {
    const report = this.editable(userId, reportId);
    const expense = report.expenses.find((e) => e.id === expenseId);
    if (!expense) throw notFound('expense');
    if (expense.cardTransactionId) this.unlinkTransaction(expense.cardTransactionId);
    report.expenses = report.expenses.filter((e) => e.id !== expenseId);
    this.store.put(report);
    return this.withEvaluation(report);
  }

  /**
   * Submit for approval. Compliant reports at or under the auto-approve
   * ceiling are approved on the spot; everything else lands in the
   * approver's queue with each flag spelled out.
   */
  submitReport(userId: string, id: string): ReportWithEvaluation {
    const report = this.owned(userId, id);
    if (report.status !== 'draft') throw conflict(`cannot submit a ${report.status} report`);
    if (report.expenses.length === 0) throw new DomainError('add at least one expense before submitting');
    const evaluation = this.evaluate(report);
    const at = this.now().toISOString();
    report.submittedAt = at;
    if (evaluation.autoApprovable) {
      report.status = 'approved';
      report.autoApproved = true;
      report.decidedAt = at;
      report.history.push({ at, by: userId, action: 'submitted' });
      report.history.push({ at, by: 'policy-engine', action: 'auto-approved' });
    } else {
      report.status = 'submitted';
      report.history.push({
        at,
        by: userId,
        action: 'submitted',
        note: `${evaluation.violations.length} flag(s) for review`,
      });
    }
    this.store.put(report);
    return { report, evaluation };
  }

  /** Pull a submitted report back, or revise a rejected one. */
  reopenReport(userId: string, id: string): ReportWithEvaluation {
    const report = this.owned(userId, id);
    if (report.status !== 'submitted' && report.status !== 'rejected') {
      throw conflict(`cannot reopen a ${report.status} report`);
    }
    report.status = 'draft';
    delete report.submittedAt;
    delete report.decidedAt;
    delete report.rejectionReason;
    report.history.push({ at: this.now().toISOString(), by: userId, action: 'reopened' });
    this.store.put(report);
    return this.withEvaluation(report);
  }

  approveReport(userId: string, id: string): ReportWithEvaluation {
    const report = this.reviewed(userId, id);
    if (report.status !== 'submitted') throw conflict(`cannot approve a ${report.status} report`);
    report.status = 'approved';
    report.decidedAt = this.now().toISOString();
    report.history.push({ at: report.decidedAt, by: userId, action: 'approved' });
    this.store.put(report);
    return this.withEvaluation(report);
  }

  rejectReport(userId: string, id: string, body: unknown): ReportWithEvaluation {
    const report = this.reviewed(userId, id);
    if (report.status !== 'submitted') throw conflict(`cannot reject a ${report.status} report`);
    const reason = requireString(asRecord(body).reason, 'reason', 500);
    report.status = 'rejected';
    report.decidedAt = this.now().toISOString();
    report.rejectionReason = reason;
    report.history.push({ at: report.decidedAt, by: userId, action: 'rejected', note: reason });
    this.store.put(report);
    return this.withEvaluation(report);
  }

  reimburseReport(userId: string, id: string): ReportWithEvaluation {
    const report = this.reviewed(userId, id);
    if (report.status !== 'approved') throw conflict(`cannot reimburse a ${report.status} report`);
    report.status = 'reimbursed';
    report.reimbursedAt = this.now().toISOString();
    report.history.push({ at: report.reimbursedAt, by: userId, action: 'reimbursed' });
    this.store.put(report);
    return this.withEvaluation(report);
  }

  /**
   * Import corporate card charges into this user's feed. Re-imports are safe:
   * a charge identical to one already in the feed (any status) is skipped.
   */
  importTransactions(userId: string, body: unknown): ImportResult {
    const input = asRecord(body);
    if (!Array.isArray(input.transactions) || input.transactions.length === 0) {
      throw new DomainError('transactions must be a non-empty array');
    }
    if (input.transactions.length > 500) throw new DomainError('at most 500 transactions per import');
    // Validate the whole batch before persisting anything, so a bad row
    // rejects the import instead of leaving it half-applied.
    const parsed = input.transactions.map((raw) => this.parseTransaction(userId, raw));
    const existing = new Set(
      this.store.listTransactions((t) => t.ownerId === userId).map(transactionKey),
    );
    const imported: CardTransaction[] = [];
    let duplicateCount = 0;
    for (const txn of parsed) {
      const key = transactionKey(txn);
      if (existing.has(key)) {
        duplicateCount++;
        continue;
      }
      existing.add(key);
      this.store.putTransaction(txn);
      imported.push(txn);
    }
    return { imported, duplicateCount };
  }

  listTransactions(userId: string, status?: CardTransactionStatus): CardTransaction[] {
    return this.store
      .listTransactions((t) => t.ownerId === userId && (status === undefined || t.status === status))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Personal spend on the card that will never become an expense. */
  dismissTransaction(userId: string, id: string): CardTransaction {
    const txn = this.ownedTransaction(userId, id);
    if (txn.status !== 'unmatched') throw conflict(`cannot dismiss a ${txn.status} charge`);
    txn.status = 'dismissed';
    this.store.putTransaction(txn);
    return txn;
  }

  restoreTransaction(userId: string, id: string): CardTransaction {
    const txn = this.ownedTransaction(userId, id);
    if (txn.status !== 'dismissed') throw conflict(`cannot restore a ${txn.status} charge`);
    txn.status = 'unmatched';
    this.store.putTransaction(txn);
    return txn;
  }

  /**
   * One-click expense from a card charge: date, merchant, and amount come
   * from the feed; the filer only picks the report and category.
   */
  expenseFromTransaction(userId: string, transactionId: string, body: unknown): ReportWithEvaluation {
    const txn = this.ownedTransaction(userId, transactionId);
    if (txn.status !== 'unmatched') throw conflict(`charge is already ${txn.status}`);
    const input = asRecord(body);
    const report = this.editable(userId, requireString(input.reportId, 'reportId'));
    const category = requireString(input.category, 'category', 32) as Category;
    if (!CATEGORIES.includes(category) || category === 'mileage') {
      throw new DomainError(`category must be one of: ${CATEGORIES.filter((c) => c !== 'mileage').join(', ')}`);
    }
    const expense: Expense = {
      id: randomUUID(),
      date: txn.date,
      category,
      merchant: txn.merchant,
      description: typeof input.description === 'string' ? input.description.trim() : '',
      amountCents: txn.amountCents,
      receipt: parseReceipt(input.receipt),
      paymentMethod: 'card',
      cardTransactionId: txn.id,
    };
    report.expenses.push(expense);
    txn.status = 'matched';
    txn.expenseId = expense.id;
    txn.reportId = report.id;
    // Report first: a failed report write must not strand a matched charge.
    this.store.put(report);
    this.store.putTransaction(txn);
    return this.withEvaluation(report);
  }

  /**
   * Flatten a user's expenses to CSV — one row per expense — for finance
   * tooling. `scope: 'approvals'` exports instead the reports awaiting or past
   * this user's approval (submitted, approved, reimbursed).
   */
  exportCsv(userId: string, scope: 'mine' | 'approvals' = 'mine'): string {
    const reports =
      scope === 'approvals'
        ? this.query((r) => r.approverId === userId && r.status !== 'draft' && r.status !== 'rejected')
        : this.query((r) => r.ownerId === userId);
    const header = ['report', 'owner', 'status', 'date', 'category', 'merchant', 'description', 'amount_usd', 'payment', 'receipt'];
    const rows = reports
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .flatMap((r) =>
        r.expenses.map((e) =>
          [
            csvCell(r.title),
            csvCell(r.ownerId),
            csvCell(r.status),
            csvCell(e.date),
            csvCell(e.category),
            csvCell(e.merchant),
            csvCell(e.description),
            csvCell((e.amountCents / 100).toFixed(2)),
            csvCell(e.paymentMethod === 'card' ? 'card' : 'personal'),
            csvCell(e.receipt?.name ?? ''),
          ].join(','),
        ),
      );
    return [header.join(','), ...rows].join('\n') + '\n';
  }

  analytics(userId: string): Analytics {
    const reports = this.query((r) => r.ownerId === userId);
    const byCategory: Partial<Record<Category, number>> = {};
    const byStatus: Record<string, number> = {};
    let totalCents = 0;
    let cardCents = 0;
    let violationCount = 0;
    let autoApprovedCount = 0;
    for (const report of reports) {
      byStatus[report.status] = (byStatus[report.status] ?? 0) + 1;
      if (report.autoApproved) autoApprovedCount++;
      violationCount += this.evaluateAgainst(report, reports).violations.length;
      for (const e of report.expenses) {
        totalCents += e.amountCents;
        if (e.paymentMethod === 'card') cardCents += e.amountCents;
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountCents;
      }
    }
    return {
      reportCount: reports.length,
      totalCents,
      reimbursableCents: totalCents - cardCents,
      cardCents,
      byCategory,
      byStatus,
      autoApprovedCount,
      violationCount,
      unmatchedTransactionCount: this.store.listTransactions(
        (t) => t.ownerId === userId && t.status === 'unmatched',
      ).length,
    };
  }

  private parseExpense(body: unknown, id: string, existing?: Expense): Expense {
    const input = asRecord(body);
    const date = requireString(input.date, 'date', 10);
    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
      throw new DomainError('date must be a valid YYYY-MM-DD date');
    }
    const category = requireString(input.category, 'category', 32) as Category;
    if (!CATEGORIES.includes(category)) {
      throw new DomainError(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    const merchant = requireString(input.merchant, 'merchant');
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const receipt = parseReceipt(input.receipt, existing?.receipt);
    const paymentMethod = input.paymentMethod;
    if (paymentMethod !== undefined && paymentMethod !== 'personal' && paymentMethod !== 'card') {
      throw new DomainError('paymentMethod must be "personal" or "card"');
    }

    if (category === 'mileage') {
      const miles = input.miles;
      if (typeof miles !== 'number' || !Number.isFinite(miles) || miles <= 0 || miles > 10_000) {
        throw new DomainError('miles must be a positive number for mileage expenses');
      }
      return {
        id,
        date,
        category,
        merchant,
        description,
        miles,
        amountCents: mileageAmountCents(miles, this.policy),
        receipt,
      };
    }

    const amountCents = input.amountCents;
    if (
      typeof amountCents !== 'number' ||
      !Number.isInteger(amountCents) ||
      amountCents <= 0 ||
      amountCents > 10_000_000
    ) {
      throw new DomainError('amountCents must be a positive integer (max $100,000)');
    }
    return {
      id,
      date,
      category,
      merchant,
      description,
      amountCents,
      receipt,
      // 'personal' is an explicit opt-out of card matching; 'card' declares a
      // company-card purchase whose charge may not be in the feed yet.
      ...(paymentMethod !== undefined ? { paymentMethod } : {}),
    };
  }

  /**
   * Link a freshly parsed expense to an unmatched charge with the same
   * amount posted within the match window. Mileage never matches (it is a
   * computed allowance, not a purchase) and an explicit `personal` payment
   * method opts out entirely. Mutates the expense and returns the charge for
   * the caller to persist — AFTER the report write, so a failed report write
   * can never strand a charge in `matched` with no expense behind it.
   */
  private autoMatch(report: ExpenseReport, expense: Expense): CardTransaction | undefined {
    if (expense.category === 'mileage' || expense.cardTransactionId) return undefined;
    if (expense.paymentMethod === 'personal') return undefined;
    const candidates = this.store.listTransactions(
      (t) => t.ownerId === report.ownerId && t.status === 'unmatched',
    );
    const txn = findMatchingTransaction(expense, candidates);
    if (!txn) return undefined;
    expense.paymentMethod = 'card';
    expense.cardTransactionId = txn.id;
    txn.status = 'matched';
    txn.expenseId = expense.id;
    txn.reportId = report.id;
    return txn;
  }

  /** Return a charge to the unmatched feed when its expense goes away. */
  private unlinkTransaction(transactionId: string): void {
    const txn = this.store.getTransaction(transactionId);
    if (!txn) return;
    txn.status = 'unmatched';
    delete txn.expenseId;
    delete txn.reportId;
    this.store.putTransaction(txn);
  }

  private ownedTransaction(userId: string, id: string): CardTransaction {
    const txn = this.store.getTransaction(id);
    if (!txn) throw notFound('card transaction');
    if (txn.ownerId !== userId) throw forbidden('not your card transaction');
    return txn;
  }

  private parseTransaction(userId: string, raw: unknown): CardTransaction {
    const input = asRecord(raw);
    const date = requireString(input.date, 'transaction date', 10);
    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) {
      throw new DomainError('transaction date must be a valid YYYY-MM-DD date');
    }
    const merchant = requireString(input.merchant, 'transaction merchant');
    const amountCents = input.amountCents;
    if (
      typeof amountCents !== 'number' ||
      !Number.isInteger(amountCents) ||
      amountCents <= 0 ||
      amountCents > 10_000_000
    ) {
      throw new DomainError('transaction amountCents must be a positive integer (max $100,000)');
    }
    const last4 = requireString(input.last4, 'transaction last4', 4);
    if (!/^\d{4}$/.test(last4)) throw new DomainError('transaction last4 must be four digits');
    return { id: randomUUID(), ownerId: userId, date, merchant, amountCents, last4, status: 'unmatched' };
  }

  /** All reads flow through here so legacy documents are normalized once. */
  private read(id: string): ExpenseReport | undefined {
    const report = this.store.get(id);
    return report ? normalizeReport(report) : undefined;
  }

  private query(predicate: (r: ExpenseReport) => boolean): ExpenseReport[] {
    return this.store.list(predicate).map(normalizeReport);
  }

  /** Evaluate against a pre-fetched set of the owner's reports. */
  private evaluateAgainst(report: ExpenseReport, ownersReports: ExpenseReport[]): PolicyEvaluation {
    const otherExpenses = ownersReports
      .filter((r) => r.id !== report.id && r.status !== 'rejected')
      .flatMap((r) => r.expenses);
    return evaluateReport(report, otherExpenses, this.policy, this.today());
  }

  private evaluate(report: ExpenseReport): PolicyEvaluation {
    return this.evaluateAgainst(report, this.query((r) => r.ownerId === report.ownerId));
  }

  private withEvaluation(report: ExpenseReport): ReportWithEvaluation {
    return { report, evaluation: this.evaluate(report) };
  }

  private owned(userId: string, id: string): ExpenseReport {
    const report = this.read(id);
    if (!report) throw notFound('report');
    if (report.ownerId !== userId) throw forbidden('not your report');
    return report;
  }

  private reviewed(userId: string, id: string): ExpenseReport {
    const report = this.read(id);
    if (!report) throw notFound('report');
    if (report.approverId !== userId) throw forbidden('you are not the approver for this report');
    if (report.ownerId === userId) throw forbidden('you cannot review your own report');
    return report;
  }

  private ownedOrReviewed(userId: string, id: string): ExpenseReport {
    const report = this.read(id);
    if (!report) throw notFound('report');
    if (report.ownerId !== userId && report.approverId !== userId) throw forbidden('not your report');
    return report;
  }

  private editable(userId: string, id: string): ExpenseReport {
    const report = this.owned(userId, id);
    if (report.status !== 'draft') throw conflict(`cannot edit a ${report.status} report — reopen it first`);
    return report;
  }

  /** Total for display convenience. */
  total(report: ExpenseReport): number {
    return reportTotalCents(report);
  }
}
