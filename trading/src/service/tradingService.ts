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
import type {
  Account,
  Instrument,
  Order,
  OrderSide,
  OrderType,
  RecurringCadence,
  RecurringPlan,
  WatchlistEntry,
} from '../domain/types.ts';
import { INSTRUMENTS, ORDER_SIDES, ORDER_TYPES, RECURRING_CADENCES } from '../domain/types.ts';
import type { PricePoint, Quote } from '../domain/priceEngine.ts';
import { createMockSource, type MarketDataSource, type RawQuote } from '../domain/marketData.ts';
import { computePositions, heldQuantity, quantizeShares, type RealizedTrade } from '../domain/portfolioMath.ts';
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
  /** Fractional shares (up to 6 decimal places). Market orders may pass `amountCents` instead. */
  quantity?: number;
  /** Dollar-based market order: spend/receive this many cents at the current quote. */
  amountCents?: number;
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

export interface EquityPoint {
  atMs: number;
  equityCents: number;
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
    await this.settleAccount(input.accountId, now);
    const account = this.requireAccount(input.accountId);
    const instrument = this.getInstrumentOrThrow(input.symbol);
    const side = requireEnum(input.side, ORDER_SIDES, 'side');
    const type = requireEnum(input.type, ORDER_TYPES, 'type');
    if (input.quantity !== undefined && input.amountCents !== undefined) {
      throw new ValidationError('pass either quantity or amountCents, not both');
    }
    const ts = this.timestamp(now);

    if (type === 'market') {
      const q = await this.market.getQuote(instrument, now);
      let quantity: number;
      if (input.amountCents !== undefined) {
        const amountCents = requirePositiveInt(input.amountCents, 'amountCents');
        quantity = quantizeShares(amountCents / q.priceCents);
        if (quantity <= 0) throw new ValidationError('amountCents is too small to buy any fraction of a share');
      } else {
        quantity = requireShares(input.quantity, 'quantity');
      }
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

    if (input.amountCents !== undefined) {
      throw new ValidationError('dollar-based orders are market only — pass quantity for a limit order');
    }
    const quantity = requireShares(input.quantity, 'quantity');
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
    if (filter.accountId) await this.settleAccount(filter.accountId, this.now());
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
    await this.settleAccount(accountId, now);
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
      const positionMarketValueCents = Math.round(p.quantity * q.priceCents);
      const positionUnrealizedCents = positionMarketValueCents - p.costBasisCents;
      const positionDayChangeCents = Math.round(p.quantity * q.changeCents);
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

  /**
   * The account's equity (cash + live-valued holdings) sampled over a recent
   * window — the series behind the big Home chart. Computed by replaying the
   * fill history *backwards* from the current state: at each sample time,
   * fills that happened after it are undone (a buy returns its cost to cash
   * and removes its shares; a sell the reverse), and the holdings that remain
   * are valued at that moment's price from the market-data source. The window
   * is clipped to the account's age, so a brand-new account shows a short
   * flat line at its starting cash instead of fictional history.
   */
  async getPortfolioHistory(
    accountId: string,
    opts: { points?: number; intervalMinutes?: number } = {},
  ): Promise<EquityPoint[]> {
    const now = this.now();
    await this.settleAccount(accountId, now);
    const account = this.requireAccount(accountId);
    const points = clampInt(opts.points ?? 96, 2, 500);
    const intervalMinutes = clampInt(opts.intervalMinutes ?? 15, 1, 1440);
    const stepMs = intervalMinutes * 60_000;
    const nowMs = now.getTime();
    const createdMs = Date.parse(account.createdAt);

    // Sample times, oldest first, clipped to the account's lifetime.
    const times: number[] = [];
    for (let i = points - 1; i >= 0; i--) {
      const atMs = nowMs - i * stepMs;
      if (atMs >= createdMs - stepMs) times.push(atMs);
    }
    if (times.length < 2) {
      times.length = 0;
      times.push(nowMs - stepMs, nowMs);
    }

    const allOrders = this.store.orders.list((o) => o.accountId === accountId);
    const filledDesc = allOrders
      .filter((o) => o.status === 'filled')
      .sort((a, b) => (b.filledAt ?? b.createdAt).localeCompare(a.filledAt ?? a.createdAt));

    // Historical prices for every symbol that ever appears in the history.
    const symbols = [...new Set(filledDesc.map((o) => o.symbol))];
    const priceSeries = new Map<string, PricePoint[]>();
    for (const symbol of symbols) {
      priceSeries.set(
        symbol,
        await this.market.getHistory(this.getInstrumentOrThrow(symbol), { points, intervalMinutes }, now),
      );
    }

    // Walk backwards from the current state, undoing fills as we pass them.
    let cashCents = account.cashCents;
    const held = new Map<string, number>();
    for (const p of computePositions(allOrders).positions) held.set(p.symbol, p.quantity);

    const out: EquityPoint[] = new Array(times.length);
    let orderIdx = 0;
    for (let ti = times.length - 1; ti >= 0; ti--) {
      const atMs = times[ti];
      const atIso = new Date(atMs).toISOString();
      while (orderIdx < filledDesc.length && (filledDesc[orderIdx].filledAt ?? filledDesc[orderIdx].createdAt) > atIso) {
        const o = filledDesc[orderIdx];
        const costCents = Math.round(o.quantity * (o.filledPriceCents ?? 0));
        if (o.side === 'buy') {
          cashCents += costCents;
          held.set(o.symbol, quantizeShares((held.get(o.symbol) ?? 0) - o.quantity));
        } else {
          cashCents -= costCents;
          held.set(o.symbol, quantizeShares((held.get(o.symbol) ?? 0) + o.quantity));
        }
        orderIdx++;
      }
      let equityCents = cashCents;
      for (const [symbol, quantity] of held) {
        if (quantity > 0) equityCents += Math.round(quantity * priceNearest(priceSeries.get(symbol)!, atMs));
      }
      out[ti] = { atMs, equityCents };
    }
    return out;
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

  // --- Recurring plans -------------------------------------------------------

  /**
   * Create a standing dollar-based buy. The first installment executes
   * immediately (it is due at creation time); subsequent runs execute lazily
   * whenever the account is touched after `nextRunAt` passes.
   */
  async createPlan(input: {
    accountId: string;
    symbol: string;
    amountCents: number;
    cadence: RecurringCadence;
  }): Promise<RecurringPlan> {
    const now = this.now();
    this.requireAccount(input.accountId);
    const instrument = this.getInstrumentOrThrow(input.symbol);
    const amountCents = requirePositiveInt(input.amountCents, 'amountCents');
    const cadence = requireEnum(input.cadence, RECURRING_CADENCES, 'cadence');
    const plan: RecurringPlan = {
      id: this.newId('plan'),
      accountId: input.accountId,
      symbol: instrument.symbol,
      amountCents,
      cadence,
      active: true,
      nextRunAt: this.timestamp(now),
      createdAt: this.timestamp(now),
    };
    this.store.plans.put(plan);
    await this.runDuePlans(input.accountId, now);
    return this.store.plans.get(plan.id)!;
  }

  getPlan(id: string): RecurringPlan {
    if (typeof id !== 'string' || id.length === 0) throw new ValidationError('plan id is required');
    const found = this.store.plans.get(id);
    if (!found) throw new NotFoundError('Plan', id);
    return found;
  }

  async listPlans(filter: { accountId?: string } = {}): Promise<RecurringPlan[]> {
    if (filter.accountId) await this.settleAccount(filter.accountId, this.now());
    return this.store.plans
      .list((p) => !filter.accountId || p.accountId === filter.accountId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Pause or resume. Resuming with a past-due `nextRunAt` invests on the next
   * account touch — "resume" means resume investing, not skip a cycle.
   */
  setPlanActive(id: string, active: boolean): RecurringPlan {
    const plan = this.getPlan(id);
    plan.active = active;
    this.store.plans.put(plan);
    return plan;
  }

  deletePlan(id: string): void {
    this.getPlan(id);
    this.store.plans.delete(id);
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

  /** Everything time drives, run lazily on any account touch: limit fills, then due recurring buys. */
  private async settleAccount(accountId: string, now: Date): Promise<void> {
    await this.settleOpenOrders(accountId, now);
    await this.runDuePlans(accountId, now);
  }

  /**
   * Execute every active plan whose `nextRunAt` has passed: a dollar-based
   * market buy at the current quote. A run the account can't afford is
   * recorded as skipped. Either way the schedule advances from *now*, so a
   * long-idle account gets one catch-up buy per plan, not a pile.
   */
  private async runDuePlans(accountId: string, now: Date): Promise<void> {
    const nowIso = now.toISOString();
    const due = this.store.plans
      .list((p) => p.accountId === accountId && p.active && p.nextRunAt <= nowIso)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const plan of due) {
      const instrument = this.getInstrumentOrThrow(plan.symbol);
      const q = await this.market.getQuote(instrument, now);
      const quantity = quantizeShares(plan.amountCents / q.priceCents);
      const account = this.requireAccount(accountId);
      const costCents = Math.round(quantity * q.priceCents);
      if (quantity > 0 && costCents <= account.cashCents) {
        this.applyFill(account, 'buy', plan.symbol, quantity, q.priceCents);
        this.store.orders.put({
          id: this.newId('ord'),
          accountId,
          symbol: plan.symbol,
          side: 'buy',
          type: 'market',
          quantity,
          status: 'filled',
          filledPriceCents: q.priceCents,
          filledAt: nowIso,
          planId: plan.id,
          createdAt: nowIso,
        });
        plan.lastRunStatus = 'invested';
      } else {
        plan.lastRunStatus = 'skipped_insufficient_funds';
      }
      plan.lastRunAt = nowIso;
      plan.nextRunAt = advanceCadence(now, plan.cadence).toISOString();
      this.store.plans.put(plan);
    }
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
      const cost = Math.round(quantity * priceCents);
      if (cost > account.cashCents) {
        throw new ValidationError(`insufficient buying power: need ${cost}¢, have ${account.cashCents}¢`);
      }
      account.cashCents -= cost;
    } else {
      const held = heldQuantity(this.store.orders.list((o) => o.accountId === account.id), symbol);
      if (quantity > held) {
        throw new ValidationError(`insufficient shares: hold ${held}, tried to sell ${quantity}`);
      }
      account.cashCents += Math.round(quantity * priceCents);
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
      const maxCost = Math.round(quantity * limitPriceCents);
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

/** Price at the series point nearest to `atMs` (series is chronological). */
function priceNearest(series: PricePoint[], atMs: number): number {
  if (series.length === 0) return 0;
  let best = series[0];
  for (const p of series) {
    if (Math.abs(p.atMs - atMs) <= Math.abs(best.atMs - atMs)) best = p;
    if (p.atMs > atMs && best.atMs <= atMs && Math.abs(best.atMs - atMs) <= Math.abs(p.atMs - atMs)) break;
  }
  return best.priceCents;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** The next scheduled run after a run at `from` (monthly uses calendar months). */
function advanceCadence(from: Date, cadence: RecurringCadence): Date {
  const next = new Date(from.getTime());
  if (cadence === 'daily') next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  else if (cadence === 'biweekly') next.setUTCDate(next.getUTCDate() + 14);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
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

/** A positive share quantity, quantized to 6 decimal places (min one micro-share). */
function requireShares(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive number of shares`);
  }
  const quantized = quantizeShares(value);
  if (quantized <= 0) throw new ValidationError(`${field} must be at least 0.000001 shares`);
  return quantized;
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
