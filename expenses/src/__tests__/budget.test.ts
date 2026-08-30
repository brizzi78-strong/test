import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLLOVER_MAX_MONTHS,
  addMonths,
  budgetProgress,
  hasStarted,
  isMonth,
  monthFromIndex,
  monthIndex,
  monthOf,
  summarize,
} from '../domain/budget.ts';
import type { Budget } from '../domain/types.ts';

function budget(overrides: Partial<Budget> = {}): Budget {
  const startMonth = overrides.startMonth ?? '2026-01';
  return {
    id: 'u1|meals',
    ownerId: 'u1',
    category: 'meals',
    amountCents: 50_000,
    startMonth,
    rollover: false,
    carryFromMonth: startMonth,
    carryFromCents: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const spent = (entries: Record<string, number>): Map<string, number> =>
  new Map(Object.entries(entries));

describe('month helpers', () => {
  it('validates YYYY-MM months', () => {
    assert.equal(isMonth('2026-01'), true);
    assert.equal(isMonth('2026-12'), true);
    assert.equal(isMonth('2026-00'), false);
    assert.equal(isMonth('2026-13'), false);
    assert.equal(isMonth('2026-1'), false);
    assert.equal(isMonth('2026-01-05'), false);
  });

  it('round-trips through the month index', () => {
    for (const m of ['2020-01', '2026-08', '2026-12', '1999-11']) {
      assert.equal(monthFromIndex(monthIndex(m)), m);
    }
  });

  it('steps across year boundaries in both directions', () => {
    assert.equal(addMonths('2026-01', -1), '2025-12');
    assert.equal(addMonths('2025-12', 1), '2026-01');
    assert.equal(addMonths('2026-08', 5), '2027-01');
    assert.equal(addMonths('2026-03', -15), '2024-12');
  });

  it('reads the month off an expense date', () => {
    assert.equal(monthOf('2026-08-30'), '2026-08');
  });
});

describe('budget progress', () => {
  it('reports an untouched budget as fully available', () => {
    const p = budgetProgress(budget(), '2026-02');
    assert.equal(p.availableCents, 50_000);
    assert.equal(p.spentCents, 0);
    assert.equal(p.remainingCents, 50_000);
    assert.equal(p.status, 'under');
  });

  it('crosses into warning at 80% and over past 100%', () => {
    const under = budgetProgress(budget(), '2026-02', spent({ '2026-02': 39_999 }));
    assert.equal(under.status, 'under');
    const warning = budgetProgress(budget(), '2026-02', spent({ '2026-02': 40_000 }));
    assert.equal(warning.status, 'warning');
    assert.equal(warning.ratio, 0.8);
    const exact = budgetProgress(budget(), '2026-02', spent({ '2026-02': 50_000 }));
    assert.equal(exact.status, 'warning', 'spending exactly the limit is not yet over');
    assert.equal(exact.remainingCents, 0);
    const over = budgetProgress(budget(), '2026-02', spent({ '2026-02': 50_001 }));
    assert.equal(over.status, 'over');
    assert.equal(over.remainingCents, -1);
  });

  it('ignores other months’ spend', () => {
    const p = budgetProgress(budget(), '2026-02', spent({ '2026-01': 50_000, '2026-03': 10_000 }));
    assert.equal(p.spentCents, 0);
    assert.equal(p.remainingCents, 50_000);
  });

  it('knows which months a budget governs', () => {
    const b = budget({ startMonth: '2026-06' });
    assert.equal(hasStarted(b, '2026-05'), false);
    assert.equal(hasStarted(b, '2026-06'), true);
    assert.equal(hasStarted(b, '2026-07'), true);
  });

  it('does not roll over when rollover is off', () => {
    const p = budgetProgress(budget(), '2026-03', spent({ '2026-01': 0, '2026-02': 0 }));
    assert.equal(p.rolloverCents, 0);
    assert.equal(p.availableCents, 50_000);
  });

  it('carries unspent balance forward when rollover is on', () => {
    const b = budget({ rollover: true });
    // Jan: spent 20k of 50k -> 30k carries. Feb: spent 10k of 80k -> 70k carries.
    const history = spent({ '2026-01': 20_000, '2026-02': 10_000 });
    const feb = budgetProgress(b, '2026-02', history);
    assert.equal(feb.rolloverCents, 30_000);
    assert.equal(feb.availableCents, 80_000);
    const mar = budgetProgress(b, '2026-03', history);
    assert.equal(mar.rolloverCents, 70_000);
    assert.equal(mar.availableCents, 120_000);
    assert.equal(mar.status, 'under');
  });

  it('carries an overspend forward as a negative balance', () => {
    const b = budget({ rollover: true });
    const feb = budgetProgress(b, '2026-02', spent({ '2026-01': 70_000 }));
    assert.equal(feb.rolloverCents, -20_000);
    assert.equal(feb.availableCents, 30_000);
  });

  it('can leave nothing available at all after a deep overspend', () => {
    const b = budget({ rollover: true });
    const p = budgetProgress(b, '2026-02', spent({ '2026-01': 200_000 }));
    assert.equal(p.availableCents, -100_000);
    assert.equal(p.status, 'over');
    assert.equal(p.ratio, 0, 'nothing available and nothing spent this month');
  });

  it('starts the first month with no rollover to inherit', () => {
    const p = budgetProgress(budget({ rollover: true }), '2026-01', spent({ '2026-01': 10_000 }));
    assert.equal(p.rolloverCents, 0);
    assert.equal(p.availableCents, 50_000);
  });

  it('accumulates from the carry anchor, not from the start month', () => {
    // Anchor set in March holding $200 frozen from the old limit; only
    // March onward is replayed at the current limit.
    const b = budget({ rollover: true, carryFromMonth: '2026-03', carryFromCents: 20_000 });
    const march = budgetProgress(b, '2026-03', spent({ '2026-01': 999_999, '2026-02': 999_999 }));
    assert.equal(march.rolloverCents, 20_000, 'months before the anchor are never replayed');
    assert.equal(march.availableCents, 70_000);
    const april = budgetProgress(b, '2026-04', spent({ '2026-03': 10_000 }));
    assert.equal(april.rolloverCents, 60_000, '20k carried + 50k limit − 10k spent');
  });

  it('bounds how far rollover accumulates', () => {
    const b = budget({ rollover: true, startMonth: '1990-01' });
    const month = addMonths('1990-01', ROLLOVER_MAX_MONTHS + 12);
    const p = budgetProgress(b, month, new Map());
    // Only the capped window contributes, not every month since 1990.
    assert.equal(p.rolloverCents, 50_000 * ROLLOVER_MAX_MONTHS);
  });
});

describe('budget summary', () => {
  it('totals progress and sorts categories', () => {
    const meals = budgetProgress(budget(), '2026-02', spent({ '2026-02': 10_000 }));
    const lodging = budgetProgress(
      budget({ id: 'u1|lodging', category: 'lodging', amountCents: 100_000 }),
      '2026-02',
      spent({ '2026-02': 120_000 }),
    );
    const summary = summarize('2026-02', [meals, lodging], 7_500);
    assert.deepEqual(summary.budgets.map((b) => b.category), ['lodging', 'meals']);
    assert.equal(summary.totalAvailableCents, 150_000);
    assert.equal(summary.totalSpentCents, 130_000);
    assert.equal(summary.totalRemainingCents, 20_000);
    assert.equal(summary.unbudgetedCents, 7_500);
    assert.equal(summary.overCount, 1);
  });

  it('handles a month with no budgets at all', () => {
    const summary = summarize('2026-02', [], 0);
    assert.deepEqual(summary.budgets, []);
    assert.equal(summary.totalAvailableCents, 0);
    assert.equal(summary.overCount, 0);
  });
});
