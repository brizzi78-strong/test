/**
 * Fixed-window rate limiting for the auth endpoints — small, in-memory,
 * per-process. Two instances guard login/signup: one counts attempts per
 * client IP (slows credential stuffing), one counts *failed* logins per
 * email (locks an account name out of brute force, and is reset by a
 * successful login).
 *
 * In-memory means the counters reset on restart and aren't shared between
 * replicas; that's the right cost/benefit for this app, and the interface
 * is small enough to back with something shared later.
 */

export interface RateLimiterOptions {
  /** Window length, ms. */
  windowMs: number;
  /** Hits allowed per key per window. */
  max: number;
  now?: () => number;
}

export interface RateLimiter {
  /** Record one hit; false when the key is over budget for this window. */
  hit(key: string): boolean;
  /** Hits recorded in the current window, without recording a new one. */
  count(key: string): number;
  /** Forget the key (e.g. clear failed-login count after a success). */
  reset(key: string): void;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const now = opts.now ?? Date.now;
  const windows = new Map<string, { startedAt: number; hits: number }>();

  function current(key: string): { startedAt: number; hits: number } {
    const t = now();
    const win = windows.get(key);
    if (!win || t - win.startedAt >= opts.windowMs) {
      const fresh = { startedAt: t, hits: 0 };
      windows.set(key, fresh);
      return fresh;
    }
    return win;
  }

  return {
    hit(key) {
      const win = current(key);
      win.hits += 1;
      return win.hits <= opts.max;
    },
    count(key) {
      return current(key).hits;
    },
    reset(key) {
      windows.delete(key);
    },
  };
}
