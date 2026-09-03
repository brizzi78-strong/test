import { test } from 'node:test';
import assert from 'node:assert/strict';
import { history, priceAtCents, quote } from '../domain/priceEngine.ts';
import { INSTRUMENTS } from '../domain/types.ts';

const aapl = INSTRUMENTS.find((i) => i.symbol === 'AAPL')!;

test('priceAtCents is a pure, deterministic function of time', () => {
  const t = Date.UTC(2026, 0, 15, 14, 30, 0);
  const a = priceAtCents(aapl, t);
  const b = priceAtCents(aapl, t);
  assert.equal(a, b);
});

test('priceAtCents stays within volatility bounds of the base price', () => {
  const amplitudeCents = Math.round((aapl.basePriceCents * aapl.volatilityBps) / 10000);
  for (let i = 0; i < 200; i++) {
    const t = Date.UTC(2026, 0, 1, 0, 0, 0) + i * 3_600_000;
    const p = priceAtCents(aapl, t);
    assert.ok(p >= aapl.basePriceCents - amplitudeCents - 1);
    assert.ok(p <= aapl.basePriceCents + amplitudeCents + 1);
  }
});

test('different symbols wander differently (not perfectly correlated)', () => {
  const msft = INSTRUMENTS.find((i) => i.symbol === 'MSFT')!;
  const t0 = Date.UTC(2026, 2, 1, 0, 0, 0);
  let identical = true;
  for (let i = 0; i < 50; i++) {
    const t = t0 + i * 600_000;
    const aRel = priceAtCents(aapl, t) / aapl.basePriceCents;
    const mRel = priceAtCents(msft, t) / msft.basePriceCents;
    if (Math.abs(aRel - mRel) > 1e-9) identical = false;
  }
  assert.equal(identical, false);
});

test('quote reports change relative to the last UTC midnight', () => {
  const now = new Date(Date.UTC(2026, 4, 10, 9, 0, 0));
  const q = quote(aapl, now);
  const midnight = Date.UTC(2026, 4, 10, 0, 0, 0);
  assert.equal(q.previousCloseCents, priceAtCents(aapl, midnight));
  assert.equal(q.changeCents, q.priceCents - q.previousCloseCents);
  assert.equal(q.symbol, 'AAPL');
});

test('history returns evenly spaced points ending at now', () => {
  const now = new Date(Date.UTC(2026, 4, 10, 9, 0, 0));
  const series = history(aapl, { points: 5, intervalMinutes: 10 }, now);
  assert.equal(series.length, 5);
  assert.equal(series[series.length - 1].atMs, now.getTime());
  assert.equal(series[series.length - 1].atMs - series[series.length - 2].atMs, 10 * 60_000);
  assert.equal(series[series.length - 1].priceCents, priceAtCents(aapl, now.getTime()));
});
