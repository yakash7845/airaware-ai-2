/**
 * @module airQualityProvider
 * Fetches and caches hourly Copernicus CAMS atmospheric composition feeds from Open-Meteo.
 */
import { APP_CONFIG } from '@/lib/configuration/env';
import {
  OpenMeteoAirResponseSchema,
  ValidatedOpenMeteoAir,
} from '@/lib/validation/openMeteoSchemas';
import { fetchCachedOpenMeteoFeed } from '@/services/http/openMeteoClient';

/**
 * Retrieve Zod-validated CAMS air quality concentrations (trailing 48 h + 72 h forecast)
 * for the requested coordinates, served from LRU+TTL server cache when fresh.
 *
 * @param latitude - WGS-84 latitude (-90 to 90).
 * @param longitude - WGS-84 longitude (-180 to 180).
 * @param timezone - Target IANA timezone or `'auto'`.
 * @param forceRefresh - Evict cached feed and re-fetch upstream when `true`.
 * @returns Validated Open-Meteo air quality payload.
 */
export function fetchAirQuality(
  latitude: number,
  longitude: number,
  timezone: string = 'auto',
  forceRefresh: boolean = false
): Promise<ValidatedOpenMeteoAir> {
  return fetchCachedOpenMeteoFeed(latitude, longitude, timezone, forceRefresh, {
    provider: 'open-meteo-air',
    label: 'Open-Meteo Air Quality API',
    cachePrefix: 'aq',
    baseUrl: APP_CONFIG.openMeteoAir.baseUrl,
    hourlyParams: APP_CONFIG.openMeteoAir.hourlyParams,
    currentParams: APP_CONFIG.openMeteoAir.currentParams,
    pastDays: APP_CONFIG.openMeteoAir.pastDays,
    forecastDays: APP_CONFIG.openMeteoAir.forecastDays,
    timeoutMs: APP_CONFIG.openMeteoAir.timeoutMs,
    maxRetries: APP_CONFIG.openMeteoAir.maxRetries,
    ttlMs: APP_CONFIG.cache.airQualityTtlMs,
    schema: OpenMeteoAirResponseSchema,
  });
}
