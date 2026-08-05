/**
 * Pure math over an account's filled orders: current positions (average-cost
 * basis) and realized gain/loss from sells. No I/O, no store — replaying the
 * same filled orders always produces the same result, which is what makes it
 * easy to test independently of the service/HTTP layers.
 */

import type { Order } from './types.ts';

export interface Position {
  symbol: string;
  quantity: number;
  /** Total cost basis of the shares currently held, in cents. */
  costBasisCents: number;
  /** Cost basis per share, in cents (rounded). */
  avgCostCents: number;
}

export interface RealizedTrade {
  symbol: string;
  quantity: number;
  proceedsCents: number;
  costBasisCents: number;
  realizedPnlCents: number;
}

/**
 * Replay `orders` (only `filled` ones, oldest first) into per-symbol
 * positions using the average-cost method: a buy adds to quantity and cost
 * basis; a sell removes a proportional share of the cost basis and realizes
 * the difference between proceeds and the cost basis removed.
 */
export function computePositions(orders: readonly Order[]): {
  positions: Position[];
  realized: RealizedTrade[];
} {
  const filled = orders
    .filter((o) => o.status === 'filled')
    .slice()
    .sort((a, b) => (a.filledAt ?? a.createdAt).localeCompare(b.filledAt ?? b.createdAt));

  const bySymbol = new Map<string, { qty: number; costCents: number }>();
  const realized: RealizedTrade[] = [];

  for (const order of filled) {
    const priceCents = order.filledPriceCents ?? 0;
    const state = bySymbol.get(order.symbol) ?? { qty: 0, costCents: 0 };
    if (order.side === 'buy') {
      state.qty += order.quantity;
      state.costCents += order.quantity * priceCents;
    } else {
      const sellQty = Math.min(order.quantity, state.qty);
      const costRemoved = state.qty > 0 ? Math.round((state.costCents * sellQty) / state.qty) : 0;
      const proceedsCents = sellQty * priceCents;
      realized.push({
        symbol: order.symbol,
        quantity: sellQty,
        proceedsCents,
        costBasisCents: costRemoved,
        realizedPnlCents: proceedsCents - costRemoved,
      });
      state.qty -= sellQty;
      state.costCents -= costRemoved;
    }
    bySymbol.set(order.symbol, state);
  }

  const positions: Position[] = [];
  for (const [symbol, state] of bySymbol) {
    if (state.qty > 0) {
      positions.push({
        symbol,
        quantity: state.qty,
        costBasisCents: state.costCents,
        avgCostCents: Math.round(state.costCents / state.qty),
      });
    }
  }
  positions.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return { positions, realized };
}

/** Shares of `symbol` currently held, from filled orders only. */
export function heldQuantity(orders: readonly Order[], symbol: string): number {
  const { positions } = computePositions(orders);
  return positions.find((p) => p.symbol === symbol)?.quantity ?? 0;
}
