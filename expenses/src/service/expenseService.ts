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
import {
  CATEGORIES,
  type Category,
  type Expense,
  type ExpenseReport,
  type PolicyEvaluation,
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
  byCategory: Partial<Record<Category, number>>;
  byStatus: Record<string, number>;
  autoApprovedCount: number;
  violationCount: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

  listReports(userId: string): ReportWithEvaluation[] {
    return this.store
      .list((r) => r.ownerId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => this.withEvaluation(r));
  }

  /** Reports waiting on this user's approval, oldest submission first. */
  listApprovals(userId: string): ReportWithEvaluation[] {
    return this.store
      .list((r) => r.status === 'submitted' && r.approverId === userId)
      .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
      .map((r) => this.withEvaluation(r));
  }

  getReport(userId: string, id: string): ReportWithEvaluation {
    return this.withEvaluation(this.ownedOrReviewed(userId, id));
  }

  deleteReport(userId: string, id: string): void {
    const report = this.owned(userId, id);
    if (report.status !== 'draft') throw conflict('only draft reports can be deleted');
    this.store.delete(id);
  }

  addExpense(userId: string, reportId: string, body: unknown): ReportWithEvaluation {
    const report = this.editable(userId, reportId);
    const expense = this.parseExpense(body, randomUUID());
    report.expenses.push(expense);
    this.store.put(report);
    return this.withEvaluation(report);
  }

  updateExpense(userId: string, reportId: string, expenseId: string, body: unknown): ReportWithEvaluation {
    const report = this.editable(userId, reportId);
    const index = report.expenses.findIndex((e) => e.id === expenseId);
    if (index === -1) throw notFound('expense');
    report.expenses[index] = this.parseExpense(body, expenseId);
    this.store.put(report);
    return this.withEvaluation(report);
  }

  deleteExpense(userId: string, reportId: string, expenseId: string): ReportWithEvaluation {
    const report = this.editable(userId, reportId);
    const before = report.expenses.length;
    report.expenses = report.expenses.filter((e) => e.id !== expenseId);
    if (report.expenses.length === before) throw notFound('expense');
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

  analytics(userId: string): Analytics {
    const reports = this.store.list((r) => r.ownerId === userId);
    const byCategory: Partial<Record<Category, number>> = {};
    const byStatus: Record<string, number> = {};
    let totalCents = 0;
    let violationCount = 0;
    let autoApprovedCount = 0;
    for (const report of reports) {
      byStatus[report.status] = (byStatus[report.status] ?? 0) + 1;
      if (report.autoApproved) autoApprovedCount++;
      violationCount += this.evaluate(report).violations.length;
      for (const e of report.expenses) {
        totalCents += e.amountCents;
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountCents;
      }
    }
    return { reportCount: reports.length, totalCents, byCategory, byStatus, autoApprovedCount, violationCount };
  }

  private parseExpense(body: unknown, id: string): Expense {
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
    const receipt = typeof input.receipt === 'string' && input.receipt.trim() ? input.receipt.trim() : undefined;

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
    return { id, date, category, merchant, description, amountCents, receipt };
  }

  private evaluate(report: ExpenseReport): PolicyEvaluation {
    const otherExpenses = this.store
      .list((r) => r.ownerId === report.ownerId && r.id !== report.id && r.status !== 'rejected')
      .flatMap((r) => r.expenses);
    return evaluateReport(report, otherExpenses, this.policy, this.today());
  }

  private withEvaluation(report: ExpenseReport): ReportWithEvaluation {
    return { report, evaluation: this.evaluate(report) };
  }

  private owned(userId: string, id: string): ExpenseReport {
    const report = this.store.get(id);
    if (!report) throw notFound('report');
    if (report.ownerId !== userId) throw forbidden('not your report');
    return report;
  }

  private reviewed(userId: string, id: string): ExpenseReport {
    const report = this.store.get(id);
    if (!report) throw notFound('report');
    if (report.approverId !== userId) throw forbidden('you are not the approver for this report');
    if (report.ownerId === userId) throw forbidden('you cannot review your own report');
    return report;
  }

  private ownedOrReviewed(userId: string, id: string): ExpenseReport {
    const report = this.store.get(id);
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
