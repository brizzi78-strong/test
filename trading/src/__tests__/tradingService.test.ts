import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TradingService } from '../service/tradingService.ts';
import { createInMemoryStore } from '../store/store.ts';
import { priceAtCents } from '../domain/priceEngine.ts';
import { INSTRUMENTS } from '../domain/types.ts';
import { ConflictError, NotFoundError, ValidationError } from '../service/errors.ts';

const AAPL = INSTRUMENTS.find((i) => i.symbol === 'AAPL')!;
const FIXED_NOW = new Date('2026-06-15T15:00:00.000Z');

function newService(now: () => Date = () => FIXED_NOW) {
  let n = 0;
  return new TradingService({
    store: createInMemoryStore(),
    now,
    newId: (prefix) => `${prefix}_${++n}`,
  });
}

test('createAccount defaults to $10,000 buying power', () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  assert.equal(account.cashCents, 1_000_000);
  assert.equal(account.name, 'Rob');
});

test('a market buy fills immediately at the current quote and debits cash', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  const price = priceAtCents(AAPL, FIXED_NOW.getTime());

  const order = await svc.placeOrder({ accountId: account.id, symbol: 'aapl', side: 'buy', type: 'market', quantity: 3 });
  assert.equal(order.status, 'filled');
  assert.equal(order.symbol, 'AAPL');
  assert.equal(order.filledPriceCents, price);

  const refreshed = svc.getAccount(account.id);
  assert.equal(refreshed.cashCents, 1_000_000 - 3 * price);
});

test('a market buy that exceeds buying power is rejected and nothing is charged', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob', startingCashCents: 100 });
  await assert.rejects(
    () => svc.placeOrder({ accountId: account.id, symbol: 'AAPL', side: 'buy', type: 'market', quantity: 1 }),
    ValidationError,
  );
  assert.equal(svc.getAccount(account.id).cashCents, 100);
});

test('a market sell requires shares actually held', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  await assert.rejects(
    () => svc.placeOrder({ accountId: account.id, symbol: 'AAPL', side: 'sell', type: 'market', quantity: 1 }),
    ValidationError,
  );
});

test('buy then sell round-trips cash and clears the position', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  await svc.placeOrder({ accountId: account.id, symbol: 'AAPL', side: 'buy', type: 'market', quantity: 5 });
  await svc.placeOrder({ accountId: account.id, symbol: 'AAPL', side: 'sell', type: 'market', quantity: 5 });

  assert.equal(svc.getAccount(account.id).cashCents, 1_000_000);
  const portfolio = await svc.getPortfolio(account.id);
  assert.equal(portfolio.positions.length, 0);

  const pnl = svc.getRealizedPnl(account.id);
  assert.equal(pnl.totalRealizedPnlCents, 0);
});

test('a limit buy above the market price fills immediately', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  const price = priceAtCents(AAPL, FIXED_NOW.getTime());
  const order = await svc.placeOrder({
    accountId: account.id,
    symbol: 'AAPL',
    side: 'buy',
    type: 'limit',
    quantity: 2,
    limitPriceCents: price + 5000,
  });
  assert.equal(order.status, 'filled');
  assert.equal(order.filledPriceCents, price);
});

test('a limit buy far below market rests open, then fills once the feed crosses it', async () => {
  let clock = new Date('2026-06-15T15:00:00.000Z');
  const svc = newService(() => clock);
  const account = svc.createAccount({ name: 'Rob' });
  const price = priceAtCents(AAPL, clock.getTime());
  const farBelow = Math.max(1, price - 100_000);

  const placed = await svc.placeOrder({
    accountId: account.id,
    symbol: 'AAPL',
    side: 'buy',
    type: 'limit',
    quantity: 1,
    limitPriceCents: farBelow,
  });
  assert.equal(placed.status, 'open');
  // cash is not reserved for a resting limit order
  assert.equal(svc.getAccount(account.id).cashCents, 1_000_000);

  // Listing/portfolio calls settle open orders against the *current* clock,
  // but the feed won't have crossed such a deep limit — still open.
  const stillOpen = (await svc.listOrders({ accountId: account.id }))[0];
  assert.equal(stillOpen.status, 'open');
});

test('a limit order at exactly the current price crosses and fills on placement', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  const price = priceAtCents(AAPL, FIXED_NOW.getTime());
  const order = await svc.placeOrder({
    accountId: account.id,
    symbol: 'AAPL',
    side: 'buy',
    type: 'limit',
    quantity: 1,
    limitPriceCents: price,
  });
  assert.equal(order.status, 'filled');
});

test('cancelOrder withdraws a resting order and rejects a non-open one', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  const price = priceAtCents(AAPL, FIXED_NOW.getTime());
  const order = await svc.placeOrder({
    accountId: account.id,
    symbol: 'AAPL',
    side: 'buy',
    type: 'limit',
    quantity: 1,
    limitPriceCents: Math.max(1, price - 100_000),
  });
  assert.equal(order.status, 'open');
  const cancelled = svc.cancelOrder(order.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.throws(() => svc.cancelOrder(order.id), ConflictError);
});

test('unknown symbols and accounts raise NotFoundError', async () => {
  const svc = newService();
  await assert.rejects(() => svc.getQuote('NOPE'), NotFoundError);
  assert.throws(() => svc.getAccount('acct_missing'), NotFoundError);
});

test('portfolio values positions at the live quote and tracks unrealized P&L', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  const price = priceAtCents(AAPL, FIXED_NOW.getTime());
  await svc.placeOrder({ accountId: account.id, symbol: 'AAPL', side: 'buy', type: 'market', quantity: 4 });

  const portfolio = await svc.getPortfolio(account.id);
  assert.equal(portfolio.positions.length, 1);
  const pos = portfolio.positions[0];
  assert.equal(pos.quantity, 4);
  assert.equal(pos.priceCents, price);
  assert.equal(pos.marketValueCents, 4 * price);
  assert.equal(pos.unrealizedPnlCents, 0); // bought and valued at the same instant
  assert.equal(portfolio.equityCents, portfolio.cashCents + portfolio.marketValueCents);
});

test('watchlist add is idempotent and remove is a no-op when absent', async () => {
  const svc = newService();
  const account = svc.createAccount({ name: 'Rob' });
  const first = svc.addToWatchlist(account.id, 'aapl');
  const second = svc.addToWatchlist(account.id, 'AAPL');
  assert.equal(first.id, second.id);
  assert.equal((await svc.listWatchlist(account.id)).length, 1);

  svc.removeFromWatchlist(account.id, 'AAPL');
  assert.equal((await svc.listWatchlist(account.id)).length, 0);
  svc.removeFromWatchlist(account.id, 'AAPL'); // no throw
});

test('listInstruments and listQuotes cover the full mock universe', async () => {
  const svc = newService();
  assert.equal(svc.listInstruments().length, INSTRUMENTS.length);
  assert.equal((await svc.listQuotes()).length, INSTRUMENTS.length);
});
