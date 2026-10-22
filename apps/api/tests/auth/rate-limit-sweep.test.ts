import { describe, expect, test } from 'vitest';

import { FixedWindowRateLimiter } from '../../src/auth/rate-limit.js';

// The public centre-form endpoints key the limiter by client IP; ended windows
// are swept so a stream of distinct IPs cannot grow the map without bound.

describe('FixedWindowRateLimiter', () => {
  test('limits within a window and resets after it', () => {
    const limiter = new FixedWindowRateLimiter(1000);
    expect(limiter.consume('ip', 2, 0).allowed).toBe(true);
    expect(limiter.consume('ip', 2, 10).allowed).toBe(true);
    expect(limiter.consume('ip', 2, 20)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.consume('ip', 2, 1000).allowed).toBe(true);
  });

  test('sweep drops only windows that have ended', () => {
    const limiter = new FixedWindowRateLimiter(1000);
    limiter.consume('old', 1, 0);
    limiter.consume('live', 1, 900);
    limiter.sweep(1000);
    expect(limiter.consume('old', 1, 1001).allowed).toBe(true);
    expect(limiter.consume('live', 1, 1001).allowed).toBe(false);
  });

  test('thousands of one-off keys are swept once their windows end', () => {
    const limiter = new FixedWindowRateLimiter(1000);
    for (let i = 0; i < 6000; i += 1) limiter.consume(`ip-${i}`, 5, 0);
    limiter.consume('late', 5, 5000);
    const size = (limiter as unknown as { entries: Map<string, unknown> }).entries.size;
    expect(size).toBeLessThan(10);
  });
});
