import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findMatchingTransaction } from '../domain/matching.ts';
import type { CardTransaction } from '../domain/types.ts';

let nextId = 0;
function txn(overrides: Partial<CardTransaction> = {}): CardTransaction {
  return {
    id: `t${nextId++}`,
    ownerId: 'ada',
    date: '2026-08-04',
    merchant: 'Delta',
    amountCents: 41_800,
    last4: '4242',
    status: 'unmatched',
    ...overrides,
  };
}

describe('card matching', () => {
  it('matches an identical amount within the posting window', () => {
    const t = txn();
    assert.equal(findMatchingTransaction({ date: '2026-08-03', amountCents: 41_800 }, [t]), t);
  });

  it('never matches a different amount, even on the same day', () => {
    const t = txn();
    assert.equal(findMatchingTransaction({ date: '2026-08-04', amountCents: 41_799 }, [t]), undefined);
  });

  it('respects the ±3 day window', () => {
    const t = txn({ date: '2026-08-04' });
    assert.equal(findMatchingTransaction({ date: '2026-08-07', amountCents: 41_800 }, [t]), t);
    assert.equal(findMatchingTransaction({ date: '2026-08-08', amountCents: 41_800 }, [t]), undefined);
  });

  it('prefers the charge with the closest posting date', () => {
    const near = txn({ date: '2026-08-05' });
    const far = txn({ date: '2026-08-07' });
    assert.equal(findMatchingTransaction({ date: '2026-08-04', amountCents: 41_800 }, [far, near]), near);
  });

  it('skips matched and dismissed charges', () => {
    const matched = txn({ status: 'matched' });
    const dismissed = txn({ status: 'dismissed' });
    assert.equal(
      findMatchingTransaction({ date: '2026-08-04', amountCents: 41_800 }, [matched, dismissed]),
      undefined,
    );
  });
});
