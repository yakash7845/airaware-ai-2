import { APP_CONFIG } from '@/lib/configuration/env';
import { RateLimitError } from '@/lib/errors/appError';
import { extractClientIdentifier, rateLimiter, RateLimitDecision } from './rateLimit';

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
