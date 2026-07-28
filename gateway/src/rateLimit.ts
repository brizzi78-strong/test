/**
 * Per-key token-bucket rate limiter. Each key gets `burst` tokens that refill at
 * `ratePerSec`; a request costs one token. The clock is injectable for tests.
 */

export interface RateLimiter {
  allow(id: string): boolean;
}

export function createTokenBucket(
  ratePerSec: number,
  burst: number = ratePerSec,
  now: () => number = () => Date.now(),
): RateLimiter {
  const buckets = new Map<string, { tokens: number; ts: number }>();
  return {
    allow(id: string): boolean {
      const t = now();
      let b = buckets.get(id);
      if (!b) {
        b = { tokens: burst, ts: t };
        buckets.set(id, b);
      }
      const elapsedSec = Math.max(0, (t - b.ts) / 1000);
      b.tokens = Math.min(burst, b.tokens + elapsedSec * ratePerSec);
      b.ts = t;
      if (b.tokens >= 1) {
        b.tokens -= 1;
        return true;
      }
      return false;
    },
  };
}
