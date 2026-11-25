/**
 * @module weatherProvider
 * Fetches and caches hourly and current meteorological context from Open-Meteo Weather API,
 * plus WMO weather code classification helpers.
 */
import { APP_CONFIG } from '@/lib/configuration/env';
import {
  OpenMeteoWeatherResponseSchema,
  ValidatedOpenMeteoWeather,
} from '@/lib/validation/openMeteoSchemas';
import { fetchCachedOpenMeteoFeed } from '@/services/http/openMeteoClient';
import { WeatherConditionKey } from '@/types';

/**
 * Map a numeric WMO meteorological weather code to a normalized AirAware condition key.
 *
 * @param code - WMO weather interpretation code (0–99), or null/undefined.
 * @returns Canonical {@link WeatherConditionKey}.
 */
export function mapWmoWeatherCode(code: number | null | undefined): WeatherConditionKey {
  if (code === null || code === undefined || !Number.isFinite(code)) return 'UNKNOWN';
  if (code === 0) return 'CLEAR';
  if (code === 1 || code === 2) return 'PARTLY_CLOUDY';
  if (code === 3) return 'OVERCAST';
  if (code === 45 || code === 48) return 'FOG';
  if (code >= 51 && code <= 57) return 'DRIZZLE';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'RAIN';
  if (code >= 95 && code <= 99) return 'THUNDERSTORM';
  return 'UNKNOWN';
}

/**
 * Retrieve Zod-validated Open-Meteo meteorological forecast/hindcast data for the
 * requested coordinates, served from LRU+TTL server cache when fresh.
 *
 * @param latitude - WGS-84 latitude (-90 to 90).
 * @param longitude - WGS-84 longitude (-180 to 180).
 * @param timezone - Target IANA timezone or `'auto'`.
 * @param forceRefresh - Evict cached feed and re-fetch upstream when `true`.
 * @returns Validated Open-Meteo weather payload.
 */
export function fetchWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'auto',
  forceRefresh: boolean = false
): Promise<ValidatedOpenMeteoWeather> {
  return fetchCachedOpenMeteoFeed(latitude, longitude, timezone, forceRefresh, {
    provider: 'open-meteo-weather',
    label: 'Open-Meteo Weather API',
    cachePrefix: 'weather',
    baseUrl: APP_CONFIG.openMeteoWeather.baseUrl,
    hourlyParams: APP_CONFIG.openMeteoWeather.hourlyParams,
    currentParams: APP_CONFIG.openMeteoWeather.currentParams,
    pastDays: APP_CONFIG.openMeteoWeather.pastDays,
    forecastDays: APP_CONFIG.openMeteoWeather.forecastDays,
    timeoutMs: APP_CONFIG.openMeteoWeather.timeoutMs,
    maxRetries: APP_CONFIG.openMeteoWeather.maxRetries,
    ttlMs: APP_CONFIG.cache.weatherTtlMs,
    schema: OpenMeteoWeatherResponseSchema,
  });
}
