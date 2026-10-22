interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Expired windows are swept once the map holds this many keys. */
const SWEEP_AT = 5000;

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly windowMs: number) {}

  consume(key: string, limit: number, now = Date.now()): RateLimitResult {
    if (this.entries.size >= SWEEP_AT) this.sweep(now);
    const entry = this.entries.get(key);
    const resetAt = now + this.windowMs;

    if (!entry || now >= entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }

    entry.count += 1;
    this.entries.set(key, entry);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.entries.clear();
  }

  /** Drop windows that have already ended (public endpoints are keyed by client IP). */
  sweep(now = Date.now()): void {
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) this.entries.delete(key);
    }
  }
}
