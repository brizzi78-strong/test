import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePositions, heldQuantity } from '../domain/portfolioMath.ts';
import type { Order } from '../domain/types.ts';

function ord(partial: Partial<Order>): Order {
  return {
    id: partial.id ?? `ord_${Math.random()}`,
    accountId: 'acct_1',
    symbol: 'AAPL',
    side: 'buy',
    type: 'market',
    quantity: 1,
    status: 'filled',
    createdAt: '2026-01-01T00:00:00.000Z',
    filledAt: '2026-01-01T00:00:00.000Z',
    filledPriceCents: 10000,
    ...partial,
  };
}

test('a single buy establishes a position at its fill price', () => {
  const { positions } = computePositions([ord({ quantity: 10, filledPriceCents: 10000 })]);
  assert.equal(positions.length, 1);
  assert.deepEqual(positions[0], {
    symbol: 'AAPL',
    quantity: 10,
    costBasisCents: 100000,
    avgCostCents: 10000,
  });
});

test('two buys at different prices average the cost basis', () => {
  const { positions } = computePositions([
    ord({ id: 'a', quantity: 10, filledPriceCents: 10000, filledAt: '2026-01-01T00:00:00.000Z' }),
    ord({ id: 'b', quantity: 10, filledPriceCents: 12000, filledAt: '2026-01-02T00:00:00.000Z' }),
  ]);
  assert.equal(positions[0].quantity, 20);
  assert.equal(positions[0].costBasisCents, 220000);
  assert.equal(positions[0].avgCostCents, 11000);
});

test('a partial sell removes a proportional share of cost basis and realizes P&L', () => {
  const { positions, realized } = computePositions([
    ord({ id: 'a', side: 'buy', quantity: 10, filledPriceCents: 10000, filledAt: '2026-01-01T00:00:00.000Z' }),
    ord({ id: 'b', side: 'sell', quantity: 4, filledPriceCents: 15000, filledAt: '2026-01-02T00:00:00.000Z' }),
  ]);
  assert.equal(positions[0].quantity, 6);
  assert.equal(positions[0].costBasisCents, 60000); // 6 remaining shares @ 10000
  assert.equal(realized.length, 1);
  assert.deepEqual(realized[0], {
    symbol: 'AAPL',
    quantity: 4,
    proceedsCents: 60000,
    costBasisCents: 40000,
    realizedPnlCents: 20000,
  });
});

test('selling the entire position removes it and open orders are ignored', () => {
  const { positions } = computePositions([
    ord({ id: 'a', side: 'buy', quantity: 5, filledAt: '2026-01-01T00:00:00.000Z' }),
    ord({ id: 'b', side: 'sell', quantity: 5, filledAt: '2026-01-02T00:00:00.000Z' }),
    ord({ id: 'c', side: 'buy', status: 'open', filledAt: undefined, filledPriceCents: undefined, quantity: 99 }),
  ]);
  assert.equal(positions.length, 0);
});

test('heldQuantity reads current shares for one symbol', () => {
  const orders = [
    ord({ id: 'a', symbol: 'AAPL', quantity: 10 }),
    ord({ id: 'b', symbol: 'MSFT', quantity: 3 }),
  ];
  assert.equal(heldQuantity(orders, 'AAPL'), 10);
  assert.equal(heldQuantity(orders, 'MSFT'), 3);
  assert.equal(heldQuantity(orders, 'TSLA'), 0);
});

test('orders out of chronological createdAt order still replay by filledAt', () => {
  const { positions } = computePositions([
    ord({ id: 'later', quantity: 10, filledPriceCents: 20000, filledAt: '2026-01-05T00:00:00.000Z' }),
    ord({ id: 'earlier', quantity: 10, filledPriceCents: 10000, filledAt: '2026-01-01T00:00:00.000Z' }),
  ]);
  assert.equal(positions[0].costBasisCents, 300000);
  assert.equal(positions[0].avgCostCents, 15000);
});
