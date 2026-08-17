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

import { INSTRUMENTS, type Instrument } from './types.ts';
import { history as mockHistory, quantizePriceCents, quote as mockQuote, type PricePoint } from './priceEngine.ts';
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
          priceCents: quantizePriceCents(price * 100),
          previousCloseCents: quantizePriceCents((prevClose as number) * 100),
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
            out.push({ atMs: timestamps[i] * 1000, priceCents: quantizePriceCents(close * 100) });
          }
        }
        if (out.length === 0) throw new UpstreamError(`market data empty history for ${instrument.symbol}`);
        return out;
      });
      return series.slice(-points);
    },
  };
}

// --- Uniswap V2 pool (on-chain price for one token, e.g. HOPE) ---------------

export interface UniswapPoolOptions {
  /** Serves every other symbol, and the ETH-USD cross rate. */
  base: MarketDataSource;
  /** Any Ethereum JSON-RPC endpoint (public ones work; no key or account). */
  rpcUrl: string;
  /** The Uniswap V2 pair (token/WETH pool) address. */
  poolAddress: string;
  /** The token's own contract address, to resolve reserve ordering. */
  tokenAddress: string;
  /** Which instrument symbol this pool prices (default 'HOPE'). */
  symbol?: string;
  fetchImpl?: typeof fetch;
  quoteTtlMs?: number;
}

const SELECTOR_TOKEN0 = '0x0dfe1681';
const SELECTOR_GET_RESERVES = '0x0902f1ac';

/**
 * Price one symbol straight from its Uniswap V2 token/WETH pool: two
 * `eth_call`s (token0 once, getReserves per refresh) give the reserve ratio —
 * the token's price in ETH — and the base source's ETH-USD quote converts it
 * to cents. Both tokens are 18-decimal, so the scales cancel. No keys, no
 * custody, no third-party API: the pool itself is the price oracle, which is
 * exactly what "tradable without an exchange" means on-chain.
 *
 * The pool has no queryable price history, so history is served flat at the
 * current price — an honest "no movement data" line rather than an invented
 * one. Previous close is likewise unknowable on-chain; day change reads 0.
 */
export function createUniswapPoolSource(opts: UniswapPoolOptions): MarketDataSource {
  const symbol = (opts.symbol ?? 'HOPE').toUpperCase();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const quoteTtlMs = opts.quoteTtlMs ?? 15_000;
  const tokenAddress = opts.tokenAddress.toLowerCase();
  let token0IsToken: boolean | undefined; // resolved once, never changes for a pair
  let cachedQuote: { at: number; value: RawQuote } | undefined;

  async function ethCall(data: string): Promise<string> {
    let res: Response;
    try {
      res = await fetchImpl(opts.rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: opts.poolAddress, data }, 'latest'],
        }),
      });
    } catch (err) {
      throw new UpstreamError(`pool RPC unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) throw new UpstreamError(`pool RPC HTTP ${res.status}`);
    const json = (await res.json().catch(() => undefined)) as { result?: string; error?: { message?: string } } | undefined;
    if (!json || typeof json.result !== 'string' || json.result.length < 10) {
      throw new UpstreamError(`pool RPC error: ${json?.error?.message ?? 'malformed response'}`);
    }
    return json.result;
  }

  async function poolQuote(now: Date): Promise<RawQuote> {
    if (cachedQuote && Date.now() - cachedQuote.at < quoteTtlMs) return cachedQuote.value;
    if (token0IsToken === undefined) {
      const token0 = await ethCall(SELECTOR_TOKEN0);
      token0IsToken = `0x${token0.slice(-40).toLowerCase()}` === tokenAddress;
    }
    const reserves = await ethCall(SELECTOR_GET_RESERVES);
    const hex = reserves.slice(2);
    const reserve0 = BigInt(`0x${hex.slice(0, 64)}`);
    const reserve1 = BigInt(`0x${hex.slice(64, 128)}`);
    const tokenReserve = token0IsToken ? reserve0 : reserve1;
    const wethReserve = token0IsToken ? reserve1 : reserve0;
    if (tokenReserve === 0n) throw new UpstreamError('pool has no token liquidity');

    const eth = INSTRUMENTS.find((i) => i.symbol === 'ETH-USD')!;
    const ethUsd = await opts.base.getQuote(eth, now);
    // price(token, ETH) = wethReserve / tokenReserve; 1e12 fixed-point keeps
    // the BigInt→Number conversion inside double precision.
    const ratio = Number((wethReserve * 1_000_000_000_000n) / tokenReserve) / 1e12;
    const priceCents = quantizePriceCents(ratio * ethUsd.priceCents);
    const value: RawQuote = { priceCents, previousCloseCents: priceCents };
    cachedQuote = { at: Date.now(), value };
    return value;
  }

  return {
    name: `${opts.base.name}+uniswap:${symbol}`,
    async getQuote(instrument, now) {
      if (instrument.symbol !== symbol) return opts.base.getQuote(instrument, now);
      return poolQuote(now);
    },
    async getHistory(instrument, opts2, now) {
      if (instrument.symbol !== symbol) return opts.base.getHistory(instrument, opts2, now);
      const q = await poolQuote(now);
      const points = clampInt(opts2.points ?? 60, 2, 500);
      const stepMs = clampInt(opts2.intervalMinutes ?? 5, 1, 1440) * 60_000;
      const series: PricePoint[] = [];
      for (let i = points - 1; i >= 0; i--) {
        series.push({ atMs: now.getTime() - i * stepMs, priceCents: q.priceCents });
      }
      return series;
    },
  };
}

// --- selection ---------------------------------------------------------------

/**
 * `MARKET_DATA=yahoo` → live Yahoo Finance source; unset/anything else → mock.
 * Setting `ETH_RPC_URL` + `HOPE_POOL_ADDRESS` + `HOPE_TOKEN_ADDRESS` layers
 * live on-chain Uniswap pricing for HOPE on top of either base.
 */
export function marketDataFromEnv(env: NodeJS.ProcessEnv = process.env): MarketDataSource {
  const base = env.MARKET_DATA === 'yahoo' ? createYahooSource() : createMockSource();
  if (env.ETH_RPC_URL && env.HOPE_POOL_ADDRESS && env.HOPE_TOKEN_ADDRESS) {
    return createUniswapPoolSource({
      base,
      rpcUrl: env.ETH_RPC_URL,
      poolAddress: env.HOPE_POOL_ADDRESS,
      tokenAddress: env.HOPE_TOKEN_ADDRESS,
    });
  }
  return base;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
