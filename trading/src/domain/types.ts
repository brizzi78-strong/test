/**
 * Core domain types for Trading — a commission-free brokerage engine.
 *
 * Shares are always whole numbers and money is always whole **cents**
 * (integers), so cost = quantity × priceCents never drifts into floats. There
 * is no real money and no real market: prices come from a deterministic mock
 * feed (see `priceEngine.ts`) so the same moment in time always reproduces
 * the same quote — useful for demos and tests alike.
 *
 * String-literal unions (not TS enums) keep the source runnable directly
 * under Node's type stripping with no build step.
 */

export interface Instrument {
  symbol: string;
  name: string;
  /** Reference price the mock feed wanders around, in whole cents. */
  basePriceCents: number;
  /** How far the feed wanders from `basePriceCents`, in basis points of it. */
  volatilityBps: number;
}

/** A small fixed universe of tradable names — enough to browse, search, and demo with. */
export const INSTRUMENTS: readonly Instrument[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePriceCents: 22_950, volatilityBps: 250 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePriceCents: 41_800, volatilityBps: 220 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePriceCents: 17_120, volatilityBps: 260 },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', basePriceCents: 18_640, volatilityBps: 280 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', basePriceCents: 13_205, volatilityBps: 420 },
  { symbol: 'META', name: 'Meta Platforms, Inc.', basePriceCents: 56_310, volatilityBps: 320 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', basePriceCents: 24_180, volatilityBps: 520 },
  { symbol: 'NFLX', name: 'Netflix, Inc.', basePriceCents: 91_240, volatilityBps: 300 },
  { symbol: 'DIS', name: 'The Walt Disney Company', basePriceCents: 11_050, volatilityBps: 240 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', basePriceCents: 57_430, volatilityBps: 130 },
] as const;

export type OrderSide = 'buy' | 'sell';
export const ORDER_SIDES: readonly OrderSide[] = ['buy', 'sell'];

export type OrderType = 'market' | 'limit';
export const ORDER_TYPES: readonly OrderType[] = ['market', 'limit'];

/**
 * Lifecycle of an order:
 * - `open`      – a limit order resting, waiting for the market to reach its price
 * - `filled`    – executed (market orders fill immediately; limit orders fill
 *                 once the feed crosses `limitPriceCents`)
 * - `cancelled` – withdrawn before it filled (terminal)
 */
export type OrderStatus = 'open' | 'filled' | 'cancelled';
export const ORDER_STATUSES: readonly OrderStatus[] = ['open', 'filled', 'cancelled'];

export interface Account {
  id: string;
  name: string;
  /** Available cash / buying power, in cents. */
  cashCents: number;
  createdAt: string;
}

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  /** Shares — fractional, quantized to 6 decimal places (micro-shares). */
  quantity: number;
  /** Required for `type: 'limit'`. */
  limitPriceCents?: number;
  status: OrderStatus;
  filledPriceCents?: number;
  filledAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface WatchlistEntry {
  id: string;
  accountId: string;
  symbol: string;
  createdAt: string;
}
