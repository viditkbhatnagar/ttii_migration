interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly windowMs: number) {}

  consume(key: string, limit: number, now = Date.now()): RateLimitResult {
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
}
