/**
 * Card-feed matching — the anti-Concur reconciliation. A charge matches an
 * expense when the amounts are identical and the dates are within a few days
 * (card postings lag purchases). Matching is automatic on expense entry and
 * one-click from the feed, never a dedicated reconciliation screen.
 */

import type { CardTransaction, Expense } from './types.ts';

/** Card postings typically lag the purchase by a day or two. */
export const MATCH_WINDOW_DAYS = 3;

const dayDiff = (a: string, b: string): number =>
  Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/**
 * Find the unmatched charge for an expense: exact amount, within the window,
 * closest posting date wins. Returns undefined when nothing qualifies.
 */
export function findMatchingTransaction(
  expense: Pick<Expense, 'date' | 'amountCents'>,
  transactions: CardTransaction[],
): CardTransaction | undefined {
  let best: CardTransaction | undefined;
  let bestDiff = Infinity;
  for (const txn of transactions) {
    if (txn.status !== 'unmatched' || txn.amountCents !== expense.amountCents) continue;
    const diff = dayDiff(txn.date, expense.date);
    if (diff <= MATCH_WINDOW_DAYS && diff < bestDiff) {
      best = txn;
      bestDiff = diff;
    }
  }
  return best;
}
