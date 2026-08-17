/**
 * Deterministic mock market feed.
 *
 * There is no real market data here: `priceAtCents` is a pure function of
 * (symbol, timestamp) that wanders smoothly around `basePriceCents`, built
 * from a few sine waves whose period/phase/weight are derived once per symbol
 * from a seeded PRNG. That makes it:
 *
 *   - deterministic — the same instant in time always reproduces the same
 *     price, so quotes and fills are reproducible in tests;
 *   - continuous — nearby timestamps give nearby prices, so it "looks live"
 *     as real wall-clock time passes, with no ticking background process or
 *     persisted state required;
 *   - bounded — always within `volatilityBps` of `basePriceCents`.
 *
 * Swap this module for a real market-data provider without touching the rest
 * of the service — everything downstream only calls `quote()` / `history()`.
 */

import type { Instrument } from './types.ts';

interface Wave {
  periodMs: number;
  phase: number;
  weight: number;
}

// Multiple time scales (hours / tens of minutes / minutes) so the feed has
// both a slow drift and faster wiggle, the way an intraday chart does.
const WAVE_PERIODS_MS = [1000 * 60 * 60 * 6, 1000 * 60 * 37, 1000 * 60 * 11];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wavesCache = new Map<string, readonly Wave[]>();

function wavesForSymbol(symbol: string): readonly Wave[] {
  let waves = wavesCache.get(symbol);
  if (waves) return waves;
  const rnd = mulberry32(hashSeed(symbol));
  waves = WAVE_PERIODS_MS.map((periodMs) => ({
    periodMs,
    phase: rnd() * Math.PI * 2,
    weight: 0.3 + rnd() * 0.7,
  }));
  wavesCache.set(symbol, waves);
  return waves;
}

function signalAt(waves: readonly Wave[], timeMs: number): number {
  const totalWeight = waves.reduce((sum, w) => sum + w.weight, 0);
  let signal = 0;
  for (const w of waves) {
    signal += w.weight * Math.sin((2 * Math.PI * timeMs) / w.periodMs + w.phase);
  }
  return signal / totalWeight; // in [-1, 1]
}

/**
 * Quantize a price in cents: whole cents at 1¢ and above, micro-cents (six
 * decimal places) below — so micro-cap tokens like HOPE keep a real price
 * instead of being floored to a penny. Cash movements still round to whole
 * cents at fill time; only *prices* carry sub-cent precision.
 */
export function quantizePriceCents(value: number): number {
  const whole = Math.round(value);
  if (whole >= 1) return whole;
  return Math.max(0.000001, Math.round(value * 1e6) / 1e6);
}

/** The mock price for `instrument` at `timeMs` (epoch ms), in cents (≥ one micro-cent). */
export function priceAtCents(instrument: Instrument, timeMs: number): number {
  const waves = wavesForSymbol(instrument.symbol);
  const amplitudeCents = (instrument.basePriceCents * instrument.volatilityBps) / 10000;
  const signal = signalAt(waves, timeMs);
  return quantizePriceCents(instrument.basePriceCents + signal * amplitudeCents);
}

/** Most recent UTC midnight at or before `now` — the feed's "previous close" reference. */
export function lastMidnightMs(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export interface Quote {
  symbol: string;
  priceCents: number;
  previousCloseCents: number;
  changeCents: number;
  changeBps: number;
  asOf: string;
}

export function quote(instrument: Instrument, now: Date = new Date()): Quote {
  const priceCents = priceAtCents(instrument, now.getTime());
  const previousCloseCents = priceAtCents(instrument, lastMidnightMs(now));
  const changeCents = priceCents - previousCloseCents;
  const changeBps = previousCloseCents > 0 ? Math.round((changeCents / previousCloseCents) * 10000) : 0;
  return {
    symbol: instrument.symbol,
    priceCents,
    previousCloseCents,
    changeCents,
    changeBps,
    asOf: now.toISOString(),
  };
}

export interface PricePoint {
  atMs: number;
  priceCents: number;
}

/**
 * `points` evenly-spaced samples of the feed, `intervalMinutes` apart, ending
 * at `now` — enough to draw an intraday sparkline/chart.
 */
export function history(
  instrument: Instrument,
  opts: { points?: number; intervalMinutes?: number } = {},
  now: Date = new Date(),
): PricePoint[] {
  const points = clampInt(opts.points ?? 60, 2, 500);
  const intervalMinutes = clampInt(opts.intervalMinutes ?? 5, 1, 1440);
  const stepMs = intervalMinutes * 60_000;
  const nowMs = now.getTime();
  const series: PricePoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const atMs = nowMs - i * stepMs;
    series.push({ atMs, priceCents: priceAtCents(instrument, atMs) });
  }
  return series;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
