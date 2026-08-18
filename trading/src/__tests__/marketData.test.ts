import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockSource,
  createUniswapPoolSource,
  createYahooSource,
  marketDataFromEnv,
} from '../domain/marketData.ts';
import { priceAtCents, quantizePriceCents } from '../domain/priceEngine.ts';
import { INSTRUMENTS } from '../domain/types.ts';
import { UpstreamError } from '../service/errors.ts';

const AAPL = INSTRUMENTS.find((i) => i.symbol === 'AAPL')!;
const NOW = new Date('2026-06-15T15:00:00.000Z');

function yahooChartBody(overrides: Record<string, unknown> = {}) {
  return {
    chart: {
      result: [
        {
          meta: { regularMarketPrice: 229.135, previousClose: 231.5 },
          timestamp: [1750000000, 1750000300, 1750000600],
          indicators: { quote: [{ close: [228.1, null, 229.135] }] },
          ...overrides,
        },
      ],
      error: null,
    },
  };
}

function fakeFetch(status: number, body: unknown): { impl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const impl = (async (input: any) => {
    calls.push(String(input));
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}

test('mock source matches the deterministic price engine', async () => {
  const source = createMockSource();
  const q = await source.getQuote(AAPL, NOW);
  assert.equal(q.priceCents, priceAtCents(AAPL, NOW.getTime()));
  const hist = await source.getHistory(AAPL, { points: 5, intervalMinutes: 10 }, NOW);
  assert.equal(hist.length, 5);
});

test('yahoo source parses a quote (price + previous close, in cents)', async () => {
  const { impl, calls } = fakeFetch(200, yahooChartBody());
  const source = createYahooSource({ fetchImpl: impl });
  const q = await source.getQuote(AAPL, NOW);
  assert.equal(q.priceCents, 22914); // 229.135 → rounded cents
  assert.equal(q.previousCloseCents, 23150);
  assert.match(calls[0], /\/v8\/finance\/chart\/AAPL\?/);
});

test('yahoo source parses history, dropping null closes', async () => {
  const { impl } = fakeFetch(200, yahooChartBody());
  const source = createYahooSource({ fetchImpl: impl });
  const hist = await source.getHistory(AAPL, { points: 10, intervalMinutes: 5 }, NOW);
  assert.equal(hist.length, 2); // the null close is skipped
  assert.deepEqual(hist[0], { atMs: 1750000000_000, priceCents: 22810 });
  assert.deepEqual(hist[1], { atMs: 1750000600_000, priceCents: 22914 });
});

test('yahoo source caches quotes within the TTL (one upstream fetch)', async () => {
  const { impl, calls } = fakeFetch(200, yahooChartBody());
  const source = createYahooSource({ fetchImpl: impl, quoteTtlMs: 60_000 });
  await source.getQuote(AAPL, NOW);
  await source.getQuote(AAPL, NOW);
  await source.getQuote(AAPL, NOW);
  assert.equal(calls.length, 1);
});

test('yahoo source surfaces HTTP and shape failures as UpstreamError', async () => {
  const bad = createYahooSource({ fetchImpl: fakeFetch(500, {}).impl });
  await assert.rejects(() => bad.getQuote(AAPL, NOW), UpstreamError);

  const malformed = createYahooSource({ fetchImpl: fakeFetch(200, { chart: { result: [], error: { description: 'No data' } } }).impl });
  await assert.rejects(() => malformed.getQuote(AAPL, NOW), UpstreamError);

  const noPrice = createYahooSource({ fetchImpl: fakeFetch(200, yahooChartBody({ meta: {} })).impl });
  await assert.rejects(() => noPrice.getQuote(AAPL, NOW), UpstreamError);
});

// --- Uniswap pool source ----------------------------------------------------

const CARD_TOKEN = '0x1111111111111111111111111111111111111111';
const POOL = '0x2222222222222222222222222222222222222222';
const CARD = INSTRUMENTS.find((i) => i.symbol === 'CARD')!;
const ETH = INSTRUMENTS.find((i) => i.symbol === 'ETH-USD')!;

function pad32(hex: string): string {
  return hex.replace(/^0x/, '').padStart(64, '0');
}

/** Fake JSON-RPC: answers token0 and getReserves for a CARD/WETH pool. */
function fakeRpc(opts: { cardReserve: bigint; wethReserve: bigint; cardIsToken0?: boolean; fail?: boolean }) {
  const calls: string[] = [];
  const impl = (async (_url: any, init: any) => {
    const body = JSON.parse(init.body);
    calls.push(body.params[0].data);
    if (opts.fail) return new Response('boom', { status: 500 });
    let result: string;
    if (body.params[0].data === '0x0dfe1681') {
      result = '0x' + pad32(opts.cardIsToken0 !== false ? CARD_TOKEN : '0x' + 'f'.repeat(40));
    } else {
      const r0 = opts.cardIsToken0 !== false ? opts.cardReserve : opts.wethReserve;
      const r1 = opts.cardIsToken0 !== false ? opts.wethReserve : opts.cardReserve;
      result = '0x' + pad32('0x' + r0.toString(16)) + pad32('0x' + r1.toString(16)) + pad32('0x0');
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { impl, calls };
}

function poolSource(rpc: { impl: typeof fetch }, base = createMockSource()) {
  return createUniswapPoolSource({
    base,
    rpcUrl: 'http://rpc.local',
    poolAddress: POOL,
    tokenAddress: CARD_TOKEN,
    fetchImpl: rpc.impl,
  });
}

test('uniswap source prices CARD from pool reserves × the ETH-USD cross', async () => {
  // The documented launch pool: 100M CARD against 3 ETH.
  const rpc = fakeRpc({ cardReserve: 100_000_000n * 10n ** 18n, wethReserve: 3n * 10n ** 18n });
  const source = poolSource(rpc);
  const q = await source.getQuote(CARD, NOW);

  const ethUsd = await createMockSource().getQuote(ETH, NOW);
  const expected = quantizePriceCents((3 / 100_000_000) * ethUsd.priceCents);
  assert.equal(q.priceCents, expected);
  assert.ok(q.priceCents > 0 && q.priceCents < 1, `sub-cent price, got ${q.priceCents}`);
});

test('uniswap source handles either reserve ordering and caches within the TTL', async () => {
  const rpc = fakeRpc({ cardReserve: 100_000_000n * 10n ** 18n, wethReserve: 3n * 10n ** 18n, cardIsToken0: false });
  const source = poolSource(rpc);
  const a = await source.getQuote(CARD, NOW);
  const b = await source.getQuote(CARD, NOW);
  assert.equal(a.priceCents, b.priceCents);
  assert.equal(rpc.calls.length, 2); // token0 + one getReserves; second quote came from cache
});

test('uniswap source passes every other symbol through to the base source', async () => {
  const rpc = fakeRpc({ cardReserve: 1n, wethReserve: 1n });
  const source = poolSource(rpc);
  const aapl = INSTRUMENTS.find((i) => i.symbol === 'AAPL')!;
  const q = await source.getQuote(aapl, NOW);
  assert.equal(q.priceCents, priceAtCents(aapl, NOW.getTime()));
  assert.equal(rpc.calls.length, 0); // no RPC traffic for non-pool symbols
});

test('uniswap source serves flat history at the pool price and surfaces RPC failures', async () => {
  const rpc = fakeRpc({ cardReserve: 200_000_000n * 10n ** 18n, wethReserve: 3n * 10n ** 18n });
  const source = poolSource(rpc);
  const hist = await source.getHistory(CARD, { points: 5, intervalMinutes: 60 }, NOW);
  assert.equal(hist.length, 5);
  assert.ok(hist.every((p) => p.priceCents === hist[0].priceCents)); // honest "no movement data" line

  const failing = poolSource(fakeRpc({ cardReserve: 1n, wethReserve: 1n, fail: true }));
  await assert.rejects(() => failing.getQuote(CARD, NOW), UpstreamError);
});

test('marketDataFromEnv layers the pool source only when all three envs are set', () => {
  const envBase = { MARKET_DATA: '' } as NodeJS.ProcessEnv;
  assert.equal(marketDataFromEnv(envBase).name, 'mock');
  const wrapped = marketDataFromEnv({
    ETH_RPC_URL: 'http://rpc.local',
    CARD_POOL_ADDRESS: POOL,
    CARD_TOKEN_ADDRESS: CARD_TOKEN,
  } as NodeJS.ProcessEnv);
  assert.equal(wrapped.name, 'mock+uniswap:CARD');
});

test('marketDataFromEnv selects yahoo only when MARKET_DATA=yahoo', () => {
  assert.equal(marketDataFromEnv({} as NodeJS.ProcessEnv).name, 'mock');
  assert.equal(marketDataFromEnv({ MARKET_DATA: 'yahoo' } as NodeJS.ProcessEnv).name, 'yahoo');
  assert.equal(marketDataFromEnv({ MARKET_DATA: 'other' } as NodeJS.ProcessEnv).name, 'mock');
});
