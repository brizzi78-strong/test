/**
 * End-to-end: a real Trading service runs in-process; the Invest BFF points
 * at it. The tests drive the app the way the browser does — bootstrap the
 * account, quote a stock, place an order — all through the BFF's proxied
 * `/api/*`, and confirm the data really persists in Trading.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp as createInvest } from '../api/server.ts';
import { createApp as createTrading } from '../../../trading/src/api/server.ts';
import { createInMemoryStore } from '../../../trading/src/store/store.ts';

async function listen(server: { listen: Function; address: Function; close: Function }) {
  await new Promise<void>((r) => server.listen(0, r));
  return (server.address() as AddressInfo).port;
}

async function withApp(run: (base: string) => Promise<void>) {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const invest = createInvest({ tradingBase: `http://127.0.0.1:${tradingPort}`, accountName: 'Rob' });
  const investPort = await listen(invest.server);
  try {
    await run(`http://127.0.0.1:${investPort}`);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
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

test('password gate: blocks without creds, allows with, health stays open', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const invest = createInvest({
    tradingBase: `http://127.0.0.1:${tradingPort}`,
    accountName: 'Rob',
    user: 'admin',
    password: 's3cret',
  });
  const port = await listen(invest.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(`${base}/`)).status, 401);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const good = 'Basic ' + Buffer.from('admin:s3cret').toString('base64');
    assert.equal((await fetch(`${base}/`, { headers: { authorization: good } })).status, 200);
    const bad = 'Basic ' + Buffer.from('admin:wrong').toString('base64');
    assert.equal((await fetch(`${base}/`, { headers: { authorization: bad } })).status, 401);
  } finally {
    await new Promise<void>((r) => invest.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('serves the app shell', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /Invest/);
  });
});

test('bootstraps an account with default paper buying power', async () => {
  await withApp(async (base) => {
    const app = await j(base, 'GET', '/api/app');
    assert.equal(app.status, 200);
    assert.equal(app.json.accountName, 'Rob');
    assert.equal(app.json.cashCents, 1_000_000);
    assert.ok(app.json.accountId);
  });
});

test('restart reuses the same account instead of creating a duplicate', async () => {
  const trading = createTrading(createInMemoryStore());
  const tradingPort = await listen(trading.server);
  const tradingBase = `http://127.0.0.1:${tradingPort}`;
  const mkInvest = () => createInvest({ tradingBase, accountName: 'Rob' });

  const b1 = mkInvest();
  const p1 = await listen(b1.server);
  const b2 = mkInvest();
  const p2 = await listen(b2.server);
  try {
    const id1 = (await j(`http://127.0.0.1:${p1}`, 'GET', '/api/app')).json.accountId;
    const id2 = (await j(`http://127.0.0.1:${p2}`, 'GET', '/api/app')).json.accountId;
    assert.equal(id1, id2);
  } finally {
    await new Promise<void>((r) => b1.server.close(() => r()));
    await new Promise<void>((r) => b2.server.close(() => r()));
    await new Promise<void>((r) => trading.server.close(() => r()));
  }
});

test('the full trade loop persists through the BFF', async () => {
  await withApp(async (base) => {
    const app = (await j(base, 'GET', '/api/app')).json;
    const acct = app.accountId as string;

    const quote = await j(base, 'GET', '/api/quotes/AAPL');
    assert.equal(quote.status, 200);

    const buy = await j(base, 'POST', '/api/orders', {
      accountId: acct,
      symbol: 'AAPL',
      side: 'buy',
      type: 'market',
      quantity: 3,
    });
    assert.equal(buy.status, 201);
    assert.equal(buy.json.status, 'filled');

    const portfolio = await j(base, 'GET', `/api/portfolio/${acct}`);
    assert.equal(portfolio.json.positions.length, 1);
    assert.equal(portfolio.json.positions[0].quantity, 3);

    const watch = await j(base, 'POST', `/api/watchlist/${acct}`, { symbol: 'TSLA' });
    assert.equal(watch.status, 201);
    const watchlist = await j(base, 'GET', `/api/watchlist/${acct}`);
    assert.equal(watchlist.json.length, 1);
    assert.equal(watchlist.json[0].symbol, 'TSLA');

    const removed = await fetch(`${base}/api/watchlist/${acct}/TSLA`, { method: 'DELETE' });
    assert.equal(removed.status, 200);
  });
});
