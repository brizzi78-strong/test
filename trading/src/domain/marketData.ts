/**
 * Pluggable market data.
 *
 * The service asks a MarketDataSource two questions — "what does this trade
 * at right now (and what was the previous close)?" and "give me a price
 * series for a chart" — and everything else (orders, fills, portfolios) is
 * built on the answers. Two sources implement it:
 *
 *   - `createMockSource()` (default): the deterministic sine-wave feed from
 *     `priceEngine.ts`. Same instant → same price, no network, no key; this
 *     is what tests and demos run on.
 *   - `createYahooSource()`: live quotes and real intraday history from
 *     Yahoo Finance's public chart API (`query1.finance.yahoo.com`). No API
 *     key required. Responses are TTL-cached so browsing the app doesn't
 *     hammer the endpoint.
 *
 * Select with `MARKET_DATA=yahoo` (anything else, or unset → mock). The
 * source is injected into TradingService, so swapping in a different vendor
 * later means implementing this one interface.
 */

import type { Instrument } from './types.ts';
import { history as mockHistory, quote as mockQuote, type PricePoint } from './priceEngine.ts';
import { UpstreamError } from '../service/errors.ts';

/** The two numbers a quote is built from, in whole cents. */
export interface RawQuote {
  priceCents: number;
  previousCloseCents: number;
}

export interface HistoryOptions {
  points?: number;
  intervalMinutes?: number;
}

export interface MarketDataSource {
  /** Human-readable source name, surfaced in /meta. */
  readonly name: string;
  getQuote(instrument: Instrument, now: Date): Promise<RawQuote>;
  getHistory(instrument: Instrument, opts: HistoryOptions, now: Date): Promise<PricePoint[]>;
}

// --- mock (default) ---------------------------------------------------------

export function createMockSource(): MarketDataSource {
  return {
    name: 'mock',
    async getQuote(instrument, now) {
      const q = mockQuote(instrument, now);
      return { priceCents: q.priceCents, previousCloseCents: q.previousCloseCents };
    },
    async getHistory(instrument, opts, now) {
      return mockHistory(instrument, opts, now);
    },
  };
}

// --- Yahoo Finance chart API -------------------------------------------------

export interface YahooOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Cache TTL for quotes, ms (default 15s). */
  quoteTtlMs?: number;
  /** Cache TTL for history series, ms (default 60s). */
  historyTtlMs?: number;
}

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: { description?: string } | null;
  };
}

/** Yahoo's supported intraday intervals, coarsest range that covers each. */
const YAHOO_INTERVALS: ReadonlyArray<{ maxMinutes: number; interval: string; range: string }> = [
  { maxMinutes: 1, interval: '1m', range: '1d' },
  { maxMinutes: 5, interval: '5m', range: '1d' },
  { maxMinutes: 15, interval: '15m', range: '5d' },
  { maxMinutes: 30, interval: '30m', range: '5d' },
  { maxMinutes: 60, interval: '60m', range: '1mo' },
  { maxMinutes: Infinity, interval: '1d', range: '3mo' },
];

export function createYahooSource(opts: YahooOptions = {}): MarketDataSource {
  const baseUrl = (opts.baseUrl ?? 'https://query1.finance.yahoo.com').replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;
  const quoteTtlMs = opts.quoteTtlMs ?? 15_000;
  const historyTtlMs = opts.historyTtlMs ?? 60_000;
  const cache = new Map<string, { at: number; value: unknown }>();

  async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  async function fetchChart(symbol: string, range: string, interval: string): Promise<YahooChart> {
    const url = `${baseUrl}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    let res: Response;
    try {
      res = await fetchImpl(url, { headers: { accept: 'application/json' } });
    } catch (err) {
      throw new UpstreamError(`market data unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) throw new UpstreamError(`market data HTTP ${res.status} for ${symbol}`);
    const json = (await res.json().catch(() => undefined)) as YahooChart | undefined;
    const result = json?.chart?.result?.[0];
    if (!result) {
      const reason = json?.chart?.error?.description ?? 'malformed response';
      throw new UpstreamError(`market data error for ${symbol}: ${reason}`);
    }
    return json as YahooChart;
  }

  return {
    name: 'yahoo',
    async getQuote(instrument) {
      return cached(`q:${instrument.symbol}`, quoteTtlMs, async () => {
        const json = await fetchChart(instrument.symbol, '1d', '5m');
        const meta = json.chart!.result![0].meta ?? {};
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
        if (typeof price !== 'number' || !Number.isFinite(price)) {
          throw new UpstreamError(`market data missing price for ${instrument.symbol}`);
        }
        return {
          priceCents: Math.max(1, Math.round(price * 100)),
          previousCloseCents: Math.max(1, Math.round((prevClose as number) * 100)),
        };
      });
    },
    async getHistory(instrument, opts) {
      const points = clampInt(opts.points ?? 60, 2, 500);
      const intervalMinutes = clampInt(opts.intervalMinutes ?? 5, 1, 1440);
      const { interval, range } = YAHOO_INTERVALS.find((c) => intervalMinutes <= c.maxMinutes)!;
      const series = await cached(`h:${instrument.symbol}:${interval}:${range}`, historyTtlMs, async () => {
        const json = await fetchChart(instrument.symbol, range, interval);
        const result = json.chart!.result![0];
        const timestamps = result.timestamp ?? [];
        const closes = result.indicators?.quote?.[0]?.close ?? [];
        const out: PricePoint[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const close = closes[i];
          if (typeof close === 'number' && Number.isFinite(close)) {
            out.push({ atMs: timestamps[i] * 1000, priceCents: Math.max(1, Math.round(close * 100)) });
          }
        }
        if (out.length === 0) throw new UpstreamError(`market data empty history for ${instrument.symbol}`);
        return out;
      });
      return series.slice(-points);
    },
  };
}

// --- selection ---------------------------------------------------------------

/** `MARKET_DATA=yahoo` → live Yahoo Finance source; unset/anything else → mock. */
export function marketDataFromEnv(env: NodeJS.ProcessEnv = process.env): MarketDataSource {
  return env.MARKET_DATA === 'yahoo' ? createYahooSource() : createMockSource();
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
