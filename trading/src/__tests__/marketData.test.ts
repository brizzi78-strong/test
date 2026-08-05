import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSource, createYahooSource, marketDataFromEnv } from '../domain/marketData.ts';
import { priceAtCents } from '../domain/priceEngine.ts';
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

test('marketDataFromEnv selects yahoo only when MARKET_DATA=yahoo', () => {
  assert.equal(marketDataFromEnv({} as NodeJS.ProcessEnv).name, 'mock');
  assert.equal(marketDataFromEnv({ MARKET_DATA: 'yahoo' } as NodeJS.ProcessEnv).name, 'yahoo');
  assert.equal(marketDataFromEnv({ MARKET_DATA: 'other' } as NodeJS.ProcessEnv).name, 'mock');
});
