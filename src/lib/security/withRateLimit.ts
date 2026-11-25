/**
 * @module withRateLimit
 * Thin API route helper enforcing standard or AI tier sliding-window rate limits.
 */
import { APP_CONFIG } from '@/lib/configuration/env';
import { RateLimitError } from '@/lib/errors/appError';
import { extractClientIdentifier, rateLimiter, RateLimitDecision } from './rateLimit';

/**
 * Enforce sliding-window rate limits for the calling client IP and route bucket.
 *
 * @param headers - Request headers used to extract a sanitized client identifier.
 * @param routeKey - Route identifier suffix (e.g., `'air'`, `'chat'`).
 * @param tier - Quota tier: `'standard'` (default) or `'ai'`.
 * @returns The {@link RateLimitDecision} containing remaining quota metadata.
 * @throws {@link RateLimitError} with HTTP 429 and `retryAfterSeconds` if exceeded.
 */
export function enforceRouteRateLimit(
  headers: Headers,
  routeKey: string,
  tier: 'standard' | 'ai' = 'standard'
): RateLimitDecision {
  const clientId = extractClientIdentifier(headers);
  const max = tier === 'ai' ? APP_CONFIG.rateLimit.aiMax : APP_CONFIG.rateLimit.standardMax;
  const decision = rateLimiter.check(`${tier}:${routeKey}:${clientId}`, max);
  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds);
  }
  return decision;
}
