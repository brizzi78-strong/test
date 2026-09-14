import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TREATMENT, deductibleCents, summarizeScheduleC } from '../domain/scheduleC.ts';
import { CATEGORIES, type Category, type Expense } from '../domain/types.ts';

let nextId = 0;
const expense = (category: Category, amountCents: number, date = '2025-06-01'): Expense => ({
  id: `e${nextId++}`,
  date,
  category,
  merchant: `${category} vendor`,
  description: '',
  amountCents,
});

describe('Schedule C treatment', () => {
  it('covers every category, so a new one cannot silently fall through', () => {
    for (const category of CATEGORIES) {
      assert.ok(TREATMENT[category], `no treatment for ${category}`);
      assert.ok(TREATMENT[category].rate >= 0 && TREATMENT[category].rate <= 1);
    }
  });

  it('halves business meals', () => {
    assert.equal(deductibleCents(expense('meals', 10_000)), 5_000);
    // Rounded to the cent, not truncated.
    assert.equal(deductibleCents(expense('meals', 1_501)), 751);
  });

  it('allows no deduction for entertainment', () => {
    assert.equal(deductibleCents(expense('entertainment', 50_000)), 0);
    assert.equal(TREATMENT.entertainment.line, 'none');
  });

  it('deducts travel, office, software and mileage in full', () => {
    for (const category of ['airfare', 'lodging', 'ground_transport', 'office_supplies', 'software', 'mileage', 'other'] as Category[]) {
      assert.equal(deductibleCents(expense(category, 12_345)), 12_345, category);
    }
  });

  it('groups the three travel categories onto line 24a', () => {
    const summary = summarizeScheduleC(2025, [
      expense('airfare', 40_000),
      expense('lodging', 30_000),
      expense('ground_transport', 5_000),
    ]);
    assert.equal(summary.lines.length, 1);
    assert.equal(summary.lines[0]!.line, '24a');
    assert.equal(summary.lines[0]!.spentCents, 75_000);
    assert.equal(summary.lines[0]!.deductibleCents, 75_000);
    assert.deepEqual(summary.lines[0]!.categories, ['airfare', 'ground_transport', 'lodging']);
  });

  it('separates what was spent from what may be deducted', () => {
    const summary = summarizeScheduleC(2025, [
      expense('airfare', 40_000),      // fully deductible
      expense('meals', 10_000),        // half
      expense('entertainment', 20_000), // none
    ]);
    assert.equal(summary.totalSpentCents, 70_000);
    assert.equal(summary.totalDeductibleCents, 45_000);
    assert.equal(summary.disallowedCents, 25_000, 'half the meals plus all the entertainment');
    assert.equal(summary.expenseCount, 3);
  });

  it('orders lines the way the form does, with the non-deductible bucket last', () => {
    const summary = summarizeScheduleC(2025, [
      expense('entertainment', 100),
      expense('other', 100),
      expense('meals', 100),
      expense('airfare', 100),
      expense('office_supplies', 100),
      expense('mileage', 100),
    ]);
    assert.deepEqual(summary.lines.map((l) => l.line), ['9', '18', '24a', '24b', '27a', 'none']);
  });

  it('deducts mileage at the IRS rate, not at whatever the company reimbursed', () => {
    // A company paying 100¢/mile may do so, but only 70¢ is deductible in 2025.
    const generous: Expense = { ...expense('mileage', 10_000), miles: 100 };
    assert.equal(deductibleCents(generous, 2025), 7_000);
    assert.equal(deductibleCents(generous, 2024), 6_700);
    // A year with no published rate here falls back to the recorded amount.
    assert.equal(deductibleCents(generous, 1999), 10_000);
    // Mileage with no miles recorded also falls back.
    assert.equal(deductibleCents(expense('mileage', 10_000), 2025), 10_000);
  });

  it('deducts a purchase once even when it is filed on two reports', () => {
    const airfare = { ...expense('airfare', 40_000), id: 'a1' };
    const filedAgain = { ...airfare, id: 'a2' };
    const summary = summarizeScheduleC(2025, [airfare, filedAgain]);
    assert.equal(summary.totalDeductibleCents, 40_000);
    assert.equal(summary.totalSpentCents, 40_000);
    assert.equal(summary.duplicatesExcludedCents, 40_000);
    assert.equal(summary.duplicatesExcludedCount, 1);
    assert.equal(summary.expenseCount, 1);
  });

  it('reports an empty year without inventing lines', () => {
    const summary = summarizeScheduleC(2025, []);
    assert.deepEqual(summary.lines, []);
    assert.equal(summary.totalDeductibleCents, 0);
    assert.equal(summary.disallowedCents, 0);
  });
});
