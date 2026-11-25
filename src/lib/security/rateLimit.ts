import { APP_CONFIG } from '@/lib/configuration/env';

interface BucketEntry {
  timestamps: number[];
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
}

const MAX_TRACKED_KEYS = 2000;

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, BucketEntry>();

  check(
    key: string,
    maxRequests: number,
    windowMs: number = APP_CONFIG.rateLimit.windowMs
  ): RateLimitDecision {
    const now = Date.now();
    const cutoff = now - windowMs;

    if (this.buckets.size >= MAX_TRACKED_KEYS && !this.buckets.has(key)) {
      this.prune(cutoff);
      if (this.buckets.size >= MAX_TRACKED_KEYS) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey !== undefined) {
          this.buckets.delete(oldestKey);
        }
      }
    }

    const entry = this.buckets.get(key) ?? { timestamps: [] };
    const active = entry.timestamps.filter((ts) => ts > cutoff);

    if (active.length >= maxRequests) {
      const oldestInWindow = active[0] ?? now;
      const resetAtMs = oldestInWindow + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
      entry.timestamps = active;
      this.buckets.set(key, entry);
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        resetAtMs,
        retryAfterSeconds,
      };
    }

    active.push(now);
    entry.timestamps = active;
    this.buckets.set(key, entry);

    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - active.length),
      resetAtMs: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  clear(): void {
    this.buckets.clear();
  }

  private prune(cutoff: number): void {
    for (const [k, entry] of this.buckets.entries()) {
      const active = entry.timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        this.buckets.delete(k);
      } else {
        entry.timestamps = active;
      }
    }
  }
}

const globalLimiter = globalThis as unknown as {
  __airaware_rate_limiter__?: SlidingWindowRateLimiter;
};

export const rateLimiter =
  globalLimiter.__airaware_rate_limiter__ ?? new SlidingWindowRateLimiter();
if (process.env.NODE_ENV !== 'production') {
  globalLimiter.__airaware_rate_limiter__ = rateLimiter;
}

const SAFE_IP_RE = /^[0-9a-fA-F.:]+$/;

/**
 * Extract a sanitized client IP identifier from trusted proxy headers without
 * allowing arbitrary key-injection characters into rate-limiter buckets.
 */
export function extractClientIdentifier(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp && SAFE_IP_RE.test(realIp)) {
    return realIp.slice(0, 64);
  }
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp && SAFE_IP_RE.test(firstIp)) {
      return firstIp.slice(0, 64);
    }
  }
  return 'local-client';
}
