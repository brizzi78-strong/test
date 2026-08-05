/**
 * TradingService — orchestration for a commission-free brokerage demo.
 *
 * Responsibilities:
 *   - open accounts with a starting cash balance ("buying power")
 *   - quote instruments off the deterministic mock feed (`priceEngine.ts`)
 *   - place market orders (fill immediately at the current quote) and limit
 *     orders (rest `open` until the feed crosses the limit price)
 *   - derive positions and realized P&L from filled orders (average-cost
 *     method, `portfolioMath.ts`) and value a live portfolio
 *   - maintain a per-account watchlist
 *
 * The clock and id generator are injected so behavior is deterministic under
 * test. Money is handled in integer cents; shares are always whole numbers.
 */

import { randomUUID } from 'node:crypto';
import type { Account, Instrument, Order, OrderSide, OrderType, WatchlistEntry } from '../domain/types.ts';
import { INSTRUMENTS, ORDER_SIDES, ORDER_TYPES } from '../domain/types.ts';
import type { PricePoint, Quote } from '../domain/priceEngine.ts';
import { createMockSource, type MarketDataSource, type RawQuote } from '../domain/marketData.ts';
import { computePositions, heldQuantity, type RealizedTrade } from '../domain/portfolioMath.ts';
import type { Store } from '../store/store.ts';
import { ConflictError, NotFoundError, ValidationError } from './errors.ts';

export interface ServiceOptions {
  store: Store;
  /** Where quotes/history come from; defaults to the deterministic mock feed. */
  marketData?: MarketDataSource;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

const DEFAULT_STARTING_CASH_CENTS = 10_000_00; // $10,000.00 in paper buying power

export interface PlaceOrderInput {
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPriceCents?: number;
}

export interface PortfolioPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgCostCents: number;
  costBasisCents: number;
  priceCents: number;
  marketValueCents: number;
  unrealizedPnlCents: number;
  unrealizedPnlBps: number;
  dayChangeCents: number;
}

export interface Portfolio {
  accountId: string;
  cashCents: number;
  marketValueCents: number;
  equityCents: number;
  dayChangeCents: number;
  unrealizedPnlCents: number;
  positions: PortfolioPosition[];
}

export interface InstrumentQuote extends Quote {
  name: string;
}

export interface RealizedPnlReport {
  accountId: string;
  totalRealizedPnlCents: number;
  trades: RealizedTrade[];
}

export class TradingService {
  private readonly store: Store;
  private readonly market: MarketDataSource;
  private readonly now: () => Date;
  private readonly newId: (prefix: string) => string;

  constructor(opts: ServiceOptions) {
    this.store = opts.store;
    this.market = opts.marketData ?? createMockSource();
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? ((prefix) => `${prefix}_${randomUUID()}`);
  }

  /** The active market-data source's name ('mock' or a real provider). */
  get marketDataName(): string {
    return this.market.name;
  }

  // --- Accounts ------------------------------------------------------------

  createAccount(input: { name: string; startingCashCents?: number }): Account {
    const startingCashCents =
      input.startingCashCents === undefined
        ? DEFAULT_STARTING_CASH_CENTS
        : requireNonNegativeInt(input.startingCashCents, 'startingCashCents');
    const account: Account = {
      id: this.newId('acct'),
      name: requireString(input.name, 'name'),
      cashCents: startingCashCents,
      createdAt: this.timestamp(),
    };
    this.store.accounts.put(account);
    return account;
  }

  getAccount(id: string): Account {
    return this.requireAccount(id);
  }

  /** List accounts, optionally filtered by exact name (used for idempotent bootstrap). */
  listAccounts(filter?: { name?: string }): Account[] {
    const name = filter?.name?.trim();
    return this.store.accounts.list((a) => !name || a.name === name);
  }

  // --- Instruments / quotes --------------------------------------------------

  listInstruments(): Instrument[] {
    return [...INSTRUMENTS];
  }

  getInstrument(symbol: string): Instrument {
    return this.getInstrumentOrThrow(symbol);
  }

  async getQuote(symbol: string): Promise<InstrumentQuote> {
    const instrument = this.getInstrumentOrThrow(symbol);
    return this.quoteFor(instrument, this.now());
  }

  async listQuotes(): Promise<InstrumentQuote[]> {
    const now = this.now();
    return Promise.all(INSTRUMENTS.map((instrument) => this.quoteFor(instrument, now)));
  }

  async getHistory(symbol: string, opts: { points?: number; intervalMinutes?: number } = {}): Promise<PricePoint[]> {
    const instrument = this.getInstrumentOrThrow(symbol);
    return this.market.getHistory(instrument, opts, this.now());
  }

  // --- Orders ----------------------------------------------------------------

  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const now = this.now();
    this.requireAccount(input.accountId);
    await this.settleOpenOrders(input.accountId, now);
    const account = this.requireAccount(input.accountId);
    const instrument = this.getInstrumentOrThrow(input.symbol);
    const side = requireEnum(input.side, ORDER_SIDES, 'side');
    const type = requireEnum(input.type, ORDER_TYPES, 'type');
    const quantity = requirePositiveInt(input.quantity, 'quantity');
    const ts = this.timestamp(now);

    if (type === 'market') {
      const q = await this.market.getQuote(instrument, now);
      this.applyFill(account, side, instrument.symbol, quantity, q.priceCents);
      const order: Order = {
        id: this.newId('ord'),
        accountId: account.id,
        symbol: instrument.symbol,
        side,
        type,
        quantity,
        status: 'filled',
        filledPriceCents: q.priceCents,
        filledAt: ts,
        createdAt: ts,
      };
      this.store.orders.put(order);
      return order;
    }

    const limitPriceCents = requirePositiveInt(input.limitPriceCents, 'limitPriceCents');
    this.checkCanRestOrder(account, side, instrument.symbol, quantity, limitPriceCents);
    const order: Order = {
      id: this.newId('ord'),
      accountId: account.id,
      symbol: instrument.symbol,
      side,
      type,
      quantity,
      limitPriceCents,
      status: 'open',
      createdAt: ts,
    };
    this.store.orders.put(order);
    await this.tryFillLimitOrder(order, now);
    return this.store.orders.get(order.id)!;
  }

  getOrder(id: string): Order {
    return this.requireOrder(id);
  }

  async listOrders(filter: { accountId?: string; status?: Order['status']; symbol?: string } = {}): Promise<Order[]> {
    if (filter.accountId) await this.settleOpenOrders(filter.accountId, this.now());
    return this.store.orders
      .list((o) => {
        if (filter.accountId && o.accountId !== filter.accountId) return false;
        if (filter.status && o.status !== filter.status) return false;
        if (filter.symbol && o.symbol !== filter.symbol.toUpperCase()) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  cancelOrder(id: string): Order {
    const order = this.requireOrder(id);
    if (order.status !== 'open') {
      throw new ConflictError(`only an 'open' order can be cancelled (is '${order.status}')`);
    }
    order.status = 'cancelled';
    order.cancelledAt = this.timestamp();
    this.store.orders.put(order);
    return order;
  }

  // --- Portfolio / P&L ---------------------------------------------------

  async getPortfolio(accountId: string): Promise<Portfolio> {
    const now = this.now();
    await this.settleOpenOrders(accountId, now);
    const account = this.requireAccount(accountId);
    const orders = this.store.orders.list((o) => o.accountId === accountId);
    const { positions } = computePositions(orders);

    let marketValueCents = 0;
    let dayChangeCents = 0;
    let unrealizedPnlCents = 0;
    const rows: PortfolioPosition[] = [];
    for (const p of positions) {
      const instrument = this.getInstrumentOrThrow(p.symbol);
      const q = await this.quoteFor(instrument, now);
      const positionMarketValueCents = p.quantity * q.priceCents;
      const positionUnrealizedCents = positionMarketValueCents - p.costBasisCents;
      const positionDayChangeCents = p.quantity * q.changeCents;
      marketValueCents += positionMarketValueCents;
      unrealizedPnlCents += positionUnrealizedCents;
      dayChangeCents += positionDayChangeCents;
      rows.push({
        symbol: p.symbol,
        name: instrument.name,
        quantity: p.quantity,
        avgCostCents: p.avgCostCents,
        costBasisCents: p.costBasisCents,
        priceCents: q.priceCents,
        marketValueCents: positionMarketValueCents,
        unrealizedPnlCents: positionUnrealizedCents,
        unrealizedPnlBps:
          p.costBasisCents > 0 ? Math.round((positionUnrealizedCents / p.costBasisCents) * 10000) : 0,
        dayChangeCents: positionDayChangeCents,
      });
    }

    return {
      accountId,
      cashCents: account.cashCents,
      marketValueCents,
      equityCents: account.cashCents + marketValueCents,
      dayChangeCents,
      unrealizedPnlCents,
      positions: rows,
    };
  }

  getRealizedPnl(accountId: string): RealizedPnlReport {
    this.requireAccount(accountId);
    const orders = this.store.orders.list((o) => o.accountId === accountId);
    const { realized } = computePositions(orders);
    return {
      accountId,
      totalRealizedPnlCents: realized.reduce((sum, r) => sum + r.realizedPnlCents, 0),
      trades: realized,
    };
  }

  // --- Watchlist -----------------------------------------------------------

  addToWatchlist(accountId: string, symbol: string): WatchlistEntry {
    this.requireAccount(accountId);
    const instrument = this.getInstrumentOrThrow(symbol);
    const existing = this.store.watchlist.list(
      (w) => w.accountId === accountId && w.symbol === instrument.symbol,
    )[0];
    if (existing) return existing;
    const entry: WatchlistEntry = {
      id: this.newId('wl'),
      accountId,
      symbol: instrument.symbol,
      createdAt: this.timestamp(),
    };
    this.store.watchlist.put(entry);
    return entry;
  }

  removeFromWatchlist(accountId: string, symbol: string): void {
    const sym = String(symbol ?? '').trim().toUpperCase();
    const existing = this.store.watchlist.list((w) => w.accountId === accountId && w.symbol === sym)[0];
    if (existing) this.store.watchlist.delete(existing.id);
  }

  async listWatchlist(accountId: string): Promise<InstrumentQuote[]> {
    this.requireAccount(accountId);
    const now = this.now();
    const entries = this.store.watchlist
      .list((w) => w.accountId === accountId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return Promise.all(entries.map((entry) => this.quoteFor(this.getInstrumentOrThrow(entry.symbol), now)));
  }

  // --- internals -----------------------------------------------------------

  /** Build a full quote (change vs. previous close) from the market source's raw numbers. */
  private async quoteFor(instrument: Instrument, now: Date): Promise<InstrumentQuote> {
    const raw: RawQuote = await this.market.getQuote(instrument, now);
    const changeCents = raw.priceCents - raw.previousCloseCents;
    return {
      symbol: instrument.symbol,
      name: instrument.name,
      priceCents: raw.priceCents,
      previousCloseCents: raw.previousCloseCents,
      changeCents,
      changeBps: raw.previousCloseCents > 0 ? Math.round((changeCents / raw.previousCloseCents) * 10000) : 0,
      asOf: now.toISOString(),
    };
  }

  /** Attempt to fill every resting limit order on an account against the current feed. */
  private async settleOpenOrders(accountId: string, now: Date): Promise<void> {
    const openOrders = this.store.orders
      .list((o) => o.accountId === accountId && o.status === 'open' && o.type === 'limit')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const order of openOrders) await this.tryFillLimitOrder(order, now);
  }

  private async tryFillLimitOrder(order: Order, now: Date): Promise<void> {
    if (order.status !== 'open' || order.limitPriceCents === undefined) return;
    const instrument = this.getInstrumentOrThrow(order.symbol);
    const q = await this.market.getQuote(instrument, now);
    const crosses =
      order.side === 'buy' ? q.priceCents <= order.limitPriceCents : q.priceCents >= order.limitPriceCents;
    if (!crosses) return;

    const account = this.requireAccount(order.accountId);
    try {
      this.applyFill(account, order.side, order.symbol, order.quantity, q.priceCents);
    } catch {
      return; // no longer affordable/held — leave it resting, retry on the next pass
    }
    order.status = 'filled';
    order.filledPriceCents = q.priceCents;
    order.filledAt = this.timestamp(now);
    this.store.orders.put(order);
  }

  /** Move cash for a fill (buy debits, sell credits) and persist the account. */
  private applyFill(account: Account, side: OrderSide, symbol: string, quantity: number, priceCents: number): void {
    if (side === 'buy') {
      const cost = quantity * priceCents;
      if (cost > account.cashCents) {
        throw new ValidationError(`insufficient buying power: need ${cost}¢, have ${account.cashCents}¢`);
      }
      account.cashCents -= cost;
    } else {
      const held = heldQuantity(this.store.orders.list((o) => o.accountId === account.id), symbol);
      if (quantity > held) {
        throw new ValidationError(`insufficient shares: hold ${held}, tried to sell ${quantity}`);
      }
      account.cashCents += quantity * priceCents;
    }
    this.store.accounts.put(account);
  }

  /** Reject a limit order up front if it can never be honored at placement time. */
  private checkCanRestOrder(
    account: Account,
    side: OrderSide,
    symbol: string,
    quantity: number,
    limitPriceCents: number,
  ): void {
    if (side === 'buy') {
      const maxCost = quantity * limitPriceCents;
      if (maxCost > account.cashCents) {
        throw new ValidationError(
          `insufficient buying power for limit order: need up to ${maxCost}¢, have ${account.cashCents}¢`,
        );
      }
    } else {
      const held = heldQuantity(this.store.orders.list((o) => o.accountId === account.id), symbol);
      if (quantity > held) {
        throw new ValidationError(`insufficient shares: hold ${held}, tried to sell ${quantity}`);
      }
    }
  }

  private getInstrumentOrThrow(symbol: string): Instrument {
    const sym = String(symbol ?? '').trim().toUpperCase();
    const instrument = INSTRUMENTS.find((i) => i.symbol === sym);
    if (!instrument) throw new NotFoundError('Instrument', sym);
    return instrument;
  }

  private timestamp(now: Date = this.now()): string {
    return now.toISOString();
  }

  private requireAccount(id: string): Account {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError('accountId is required');
    const found = this.store.accounts.get(id);
    if (!found) throw new NotFoundError('Account', id);
    return found;
  }

  private requireOrder(id: string): Order {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError('order id is required');
    const found = this.store.orders.get(id);
    if (!found) throw new NotFoundError('Order', id);
    return found;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function requirePositiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive integer`);
  }
  return value;
}

function requireNonNegativeInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer`);
  }
  return value;
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}
