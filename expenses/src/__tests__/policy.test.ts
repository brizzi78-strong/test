import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POLICY, evaluateReport, mileageAmountCents } from '../domain/policy.ts';
import type { Expense, ExpenseReport } from '../domain/types.ts';

const TODAY = '2026-08-06';

let nextId = 0;
function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: `e${nextId++}`,
    date: '2026-08-01',
    category: 'meals',
    merchant: 'Cafe',
    description: '',
    amountCents: 1_500,
    ...overrides,
  };
}

function report(expenses: Expense[]): ExpenseReport {
  return {
    id: 'r1',
    ownerId: 'u1',
    approverId: 'manager',
    title: 'Trip',
    status: 'draft',
    expenses,
    createdAt: '2026-08-01T00:00:00Z',
    history: [],
  };
}

function codes(rep: ExpenseReport, others: Expense[] = []): string[] {
  return evaluateReport(rep, others, DEFAULT_POLICY, TODAY).violations.map((v) => v.code);
}

describe('policy engine', () => {
  it('computes mileage at the IRS rate, rounded to the cent', () => {
    assert.equal(mileageAmountCents(100), 7_000);
    assert.equal(mileageAmountCents(12.5), 875);
    assert.equal(mileageAmountCents(0.01), 1);
  });

  it('approves a compliant small report automatically', () => {
    const rep = report([expense(), expense({ merchant: 'Taxi Co', category: 'ground_transport' })]);
    const evaluation = evaluateReport(rep, [], DEFAULT_POLICY, TODAY);
    assert.equal(evaluation.totalCents, 3_000);
    assert.deepEqual(evaluation.violations, []);
    assert.equal(evaluation.autoApprovable, true);
  });

  it('requires a receipt at and above the threshold, but not below', () => {
    assert.deepEqual(codes(report([expense({ amountCents: 2_499 })])), []);
    assert.deepEqual(codes(report([expense({ amountCents: 2_500 })])), ['MISSING_RECEIPT']);
    assert.deepEqual(codes(report([expense({ amountCents: 2_500, receipt: 'lunch.jpg' })])), []);
  });

  it('never demands a receipt for mileage', () => {
    const rep = report([expense({ category: 'mileage', miles: 100, amountCents: 7_000 })]);
    assert.deepEqual(codes(rep), []);
  });

  it('flags category limit overruns', () => {
    const rep = report([expense({ amountCents: 7_501, receipt: 'dinner.jpg' })]);
    assert.deepEqual(codes(rep), ['OVER_CATEGORY_LIMIT']);
    const uncapped = report([expense({ category: 'airfare', amountCents: 80_000, receipt: 'ticket.pdf' })]);
    assert.deepEqual(codes(uncapped), []);
  });

  it('flags future-dated and stale expenses', () => {
    assert.deepEqual(codes(report([expense({ date: '2026-08-07' })])), ['FUTURE_DATE']);
    assert.deepEqual(codes(report([expense({ date: '2026-05-01' })])), ['STALE_EXPENSE']);
    assert.deepEqual(codes(report([expense({ date: '2026-05-10' })])), []);
  });

  it('detects duplicates within a report, case-insensitively on merchant', () => {
    const rep = report([expense({ merchant: 'Uber' }), expense({ merchant: '  uber ' })]);
    assert.deepEqual(codes(rep), ['DUPLICATE']);
  });

  it('detects duplicates against the owner’s other reports', () => {
    const other = expense({ merchant: 'Hilton', category: 'lodging', amountCents: 20_000, receipt: 'a.pdf' });
    const rep = report([
      expense({ merchant: 'Hilton', category: 'lodging', amountCents: 20_000, receipt: 'b.pdf' }),
    ]);
    const evaluation = evaluateReport(rep, [other], DEFAULT_POLICY, TODAY);
    assert.deepEqual(
      evaluation.violations.map((v) => v.code),
      ['DUPLICATE'],
    );
    assert.match(evaluation.violations[0]!.message, /another report/);
  });

  it('does not treat different amounts or dates as duplicates', () => {
    const rep = report([expense({ amountCents: 1_000 }), expense({ amountCents: 1_001 })]);
    assert.deepEqual(codes(rep), []);
  });

  it('withholds auto-approval above the ceiling even when compliant', () => {
    const rep = report([
      expense({ category: 'airfare', amountCents: 20_001, receipt: 'ticket.pdf' }),
    ]);
    const evaluation = evaluateReport(rep, [], DEFAULT_POLICY, TODAY);
    assert.deepEqual(evaluation.violations, []);
    assert.equal(evaluation.autoApprovable, false);
  });

  it('withholds auto-approval when any violation exists', () => {
    const rep = report([expense({ amountCents: 2_500 })]);
    assert.equal(evaluateReport(rep, [], DEFAULT_POLICY, TODAY).autoApprovable, false);
  });
});
