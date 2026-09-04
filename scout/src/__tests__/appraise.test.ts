import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appraise,
  demandScore,
  expectedSaleCents,
  isValidIsbn13,
  velocityTier,
} from '../domain/appraise.ts';
import type { DemandSignal } from '../domain/types.ts';

const signal = (over: Partial<DemandSignal> = {}): DemandSignal => ({
  isbn13: '9780132350884',
  title: 'Clean Code',
  author: 'Robert C. Martin',
  binding: 'paperback',
  salesRank: 41_000,
  avgSoldCents: 2850,
  ...over,
});

describe('isValidIsbn13', () => {
  it('accepts a valid ISBN-13 and rejects everything else', () => {
    assert.ok(isValidIsbn13('9780132350884'));
    assert.ok(isValidIsbn13('9780306406157'));
    assert.ok(!isValidIsbn13('9780132350885')); // wrong check digit
    assert.ok(!isValidIsbn13('978013235088')); // 12 digits
    assert.ok(!isValidIsbn13('97801323508840')); // 14 digits
    assert.ok(!isValidIsbn13('978013235088x'));
  });
});

describe('velocityTier', () => {
  it('maps sales rank to tiers at the documented boundaries', () => {
    assert.equal(velocityTier(1).tier, 'hot');
    assert.equal(velocityTier(25_000).tier, 'hot');
    assert.equal(velocityTier(25_001).tier, 'strong');
    assert.equal(velocityTier(150_000).tier, 'strong');
    assert.equal(velocityTier(150_001).tier, 'steady');
    assert.equal(velocityTier(600_000).tier, 'steady');
    assert.equal(velocityTier(600_001).tier, 'slow');
    assert.equal(velocityTier(1_500_000).tier, 'slow');
    assert.equal(velocityTier(1_500_001).tier, 'dead');
  });
});

describe('demandScore', () => {
  it('adds a price bump on top of the velocity base, capped at 100', () => {
    // hot base 90, sale under $15 -> no bump
    assert.equal(demandScore(signal({ salesRank: 1_200, avgSoldCents: 1450, activeOfferCents: 1299 })), 90);
    // strong base 70, sale >= $25 -> +10
    assert.equal(demandScore(signal({ salesRank: 58_000, avgSoldCents: 3900, activeOfferCents: 3550 })), 80);
    // strong base 70, sale in [$15, $25) -> +5
    assert.equal(demandScore(signal({ salesRank: 58_000, avgSoldCents: 2000 })), 75);
    // cap
    assert.equal(demandScore(signal({ salesRank: 1_200, avgSoldCents: 2600 })), 100);
  });
});

describe('expectedSaleCents', () => {
  it('caps at a lower active offer, then applies the condition multiplier', () => {
    assert.equal(expectedSaleCents(signal({ avgSoldCents: 2000, activeOfferCents: 1800 }), 'very-good'), 1530);
    assert.equal(expectedSaleCents(signal({ avgSoldCents: 2000, activeOfferCents: 2400 }), 'new'), 2000);
    assert.equal(expectedSaleCents(signal({ avgSoldCents: 2000 }), 'acceptable'), 1000);
  });
});

describe('appraise', () => {
  it('works the full margin math and says buy under the max', () => {
    // sale = round(2850 * 0.70) = 1995; fee = round(1995 * .15) = 299
    // net = 1995 - 299 - 350 = 1346; maxBuy = min(1346-300, floor(1346/1.5)) = 897
    const a = appraise(signal(), 'good', 800);
    assert.equal(a.expectedSaleCents, 1995);
    assert.equal(a.feeCents, 299);
    assert.equal(a.netProceedsCents, 1346);
    assert.equal(a.maxBuyCents, 897);
    assert.equal(a.verdict, 'buy');
    assert.deepEqual(a.reasons, []);
    assert.equal(a.projectedProfitCents, 546);
    assert.equal(a.roiBps, 6825);
  });

  it('passes when the ask is over the max buy, and says by how much', () => {
    const a = appraise(signal(), 'good', 900);
    assert.equal(a.verdict, 'pass');
    assert.match(a.reasons[0]!, /\$9\.00 is over the \$8\.97 max buy/);
  });

  it('passes on dead demand no matter how cheap the copy is', () => {
    const a = appraise(signal({ salesRank: 1_900_000, avgSoldCents: 600 }), 'very-good', 0);
    assert.equal(a.verdict, 'pass');
    assert.equal(a.reasons.length, 1);
    assert.match(a.reasons[0]!, /demand is dead/);
    assert.equal(a.maxBuyCents, 0);
  });

  it('passes when fees and shipping eat the whole sale', () => {
    const a = appraise(signal({ avgSoldCents: 400 }), 'acceptable', 0);
    // sale = 200, fee = 30, net = -180
    assert.equal(a.netProceedsCents, -180);
    assert.equal(a.maxBuyCents, 0);
    assert.equal(a.verdict, 'pass');
    assert.match(a.reasons[0]!, /fees \+ shipping/);
  });

  it('treats a free find as a buy with no ROI figure', () => {
    const a = appraise(signal(), 'good', 0);
    assert.equal(a.verdict, 'buy');
    assert.equal(a.projectedProfitCents, 1346);
    assert.equal(a.roiBps, null);
  });
});
