/**
 * @module openMeteoClient
 * Shared coordinate-based Open-Meteo feed fetcher combining coordinate validation,
 * bounded LRU+TTL server caching, timeout/retry fetching, and Zod validation.
 * Eliminates duplication between atmospheric air-quality and meteorological providers.
 */
import { z } from 'zod';
import { serverCache } from '@/services/caching/ttlCache';
import { assertValidCoordinates, fetchValidatedJson } from '@/services/http/fetchJson';

export interface OpenMeteoFeedConfig<S extends z.ZodTypeAny> {
  provider: string;
  label: string;
  cachePrefix: string;
  baseUrl: string;
  hourlyParams: string;
  currentParams: string;
  pastDays: number;
  forecastDays: number;
  timeoutMs: number;
  maxRetries: number;
  ttlMs: number;
  schema: S;
}

/**
 * Fetch and cache a coordinate-indexed Open-Meteo hourly/current feed.
 *
 * @param latitude - WGS-84 latitude.
 * @param longitude - WGS-84 longitude.
 * @param timezone - IANA timezone identifier or `'auto'`.
 * @param forceRefresh - Bypass and replace existing cached entry when `true`.
 * @param config - Feed endpoint, query parameter, retry, cache TTL, and schema config.
 * @returns Validated upstream response inferred from `config.schema`.
 */
export async function fetchCachedOpenMeteoFeed<S extends z.ZodTypeAny>(
  latitude: number,
  longitude: number,
  timezone: string,
  forceRefresh: boolean,
  config: OpenMeteoFeedConfig<S>
): Promise<z.infer<S>> {
  const { latRounded, lonRounded } = assertValidCoordinates(latitude, longitude, config.provider);
  const cacheKey = `${config.cachePrefix}:${latRounded}:${lonRounded}:${timezone}`;

  if (forceRefresh) {
    serverCache.delete(cacheKey);
  } else {
    const cached = serverCache.get<z.infer<S>>(cacheKey);
    if (cached) return cached;
  }

  const query = new URLSearchParams({
    latitude: String(latRounded),
    longitude: String(lonRounded),
    hourly: config.hourlyParams,
    current: config.currentParams,
    past_days: String(config.pastDays),
    forecast_days: String(config.forecastDays),
    timezone,
  });

  const data = await fetchValidatedJson(`${config.baseUrl}?${query.toString()}`, {
    provider: config.provider,
    label: config.label,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    schema: config.schema,
    dedupKey: cacheKey,
  });

  serverCache.set(cacheKey, data, config.ttlMs);
  return data;
}
