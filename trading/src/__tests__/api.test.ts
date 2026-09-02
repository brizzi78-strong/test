/**
 * End-to-end HTTP test: boot the trading service in-process and drive the
 * full loop over the wire — open an account, quote an instrument, place a
 * market order, check the resulting portfolio and order history, and manage
 * a watchlist.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';
import { createInMemoryStore } from '../store/store.ts';

async function withServer(run: (base: string) => Promise<void>) {
  const { server } = createApp(createInMemoryStore());
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}

async function j(base: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

test('health and meta', async () => {
  await withServer(async (base) => {
    assert.equal((await j(base, 'GET', '/health')).json.status, 'ok');
    const meta = await j(base, 'GET', '/meta');
    assert.equal(meta.json.service, 'trading');
    assert.ok(meta.json.orderSides.includes('buy'));
  });
});

test('browse instruments and quotes', async () => {
  await withServer(async (base) => {
    const instruments = await j(base, 'GET', '/instruments');
    assert.equal(instruments.status, 200);
    assert.ok(instruments.json.length > 0);

    const quote = await j(base, 'GET', '/quotes/AAPL');
    assert.equal(quote.status, 200);
    assert.equal(quote.json.symbol, 'AAPL');
    assert.ok(typeof quote.json.priceCents === 'number');

    const missing = await j(base, 'GET', '/quotes/NOPE');
    assert.equal(missing.status, 404);

    const hist = await j(base, 'GET', '/quotes/AAPL/history?points=10&intervalMinutes=5');
    assert.equal(hist.status, 200);
    assert.equal(hist.json.length, 10);
  });
});

test('full buy → portfolio → sell loop over HTTP', async () => {
  await withServer(async (base) => {
    const account = (await j(base, 'POST', '/accounts', { name: 'Rob' })).json;
    assert.equal(account.cashCents, 1_000_000);

    const buy = await j(base, 'POST', '/orders', {
      accountId: account.id,
      symbol: 'AAPL',
      side: 'buy',
      type: 'market',
      quantity: 2,
    });
    assert.equal(buy.status, 201);
    assert.equal(buy.json.status, 'filled');

    const portfolio = await j(base, 'GET', `/portfolio/${account.id}`);
    assert.equal(portfolio.status, 200);
    assert.equal(portfolio.json.positions.length, 1);
    assert.equal(portfolio.json.positions[0].quantity, 2);

    const orders = await j(base, 'GET', `/orders?accountId=${account.id}`);
    assert.equal(orders.json.length, 1);

    const sell = await j(base, 'POST', '/orders', {
      accountId: account.id,
      symbol: 'AAPL',
      side: 'sell',
      type: 'market',
      quantity: 2,
    });
    assert.equal(sell.status, 201);
    assert.equal(sell.json.status, 'filled');

    const after = await j(base, 'GET', `/portfolio/${account.id}`);
    assert.equal(after.json.positions.length, 0);
    // This test runs on the real clock, so the feed may tick a cent between
    // the buy and the sell — the round-trip is near-exact, not exact.
    assert.ok(Math.abs(after.json.cashCents - 1_000_000) <= 100, `cash ${after.json.cashCents}`);

    const pnl = await j(base, 'GET', `/realized-pnl/${account.id}`);
    assert.equal(pnl.status, 200);
    assert.ok(Array.isArray(pnl.json.trades));
  });
});

test('rejects a market buy beyond buying power', async () => {
  await withServer(async (base) => {
    const account = (await j(base, 'POST', '/accounts', { name: 'Rob', startingCashCents: 0 })).json;
    const res = await j(base, 'POST', '/orders', {
      accountId: account.id,
      symbol: 'AAPL',
      side: 'buy',
      type: 'market',
      quantity: 1,
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'validation');
  });
});

test('cancel a resting limit order', async () => {
  await withServer(async (base) => {
    const account = (await j(base, 'POST', '/accounts', { name: 'Rob' })).json;
    const quote = (await j(base, 'GET', '/quotes/AAPL')).json;
    const order = (
      await j(base, 'POST', '/orders', {
        accountId: account.id,
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 1,
        limitPriceCents: Math.max(1, quote.priceCents - 100_000),
      })
    ).json;
    assert.equal(order.status, 'open');

    const cancelled = await j(base, 'POST', `/orders/${order.id}/cancel`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.status, 'cancelled');

    const again = await j(base, 'POST', `/orders/${order.id}/cancel`);
    assert.equal(again.status, 409);
  });
});

test('watchlist add / list / remove', async () => {
  await withServer(async (base) => {
    const account = (await j(base, 'POST', '/accounts', { name: 'Rob' })).json;
    const add = await j(base, 'POST', `/watchlist/${account.id}`, { symbol: 'TSLA' });
    assert.equal(add.status, 201);

    const list = await j(base, 'GET', `/watchlist/${account.id}`);
    assert.equal(list.json.length, 1);
    assert.equal(list.json[0].symbol, 'TSLA');

    const removed = await j(base, 'DELETE', `/watchlist/${account.id}/TSLA`);
    assert.equal(removed.status, 200);
    assert.equal((await j(base, 'GET', `/watchlist/${account.id}`)).json.length, 0);
  });
});
