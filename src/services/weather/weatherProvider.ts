import { APP_CONFIG } from '@/lib/configuration/env';
import {
  OpenMeteoWeatherResponseSchema,
  ValidatedOpenMeteoWeather,
} from '@/lib/validation/openMeteoSchemas';
import { serverCache } from '@/services/caching/ttlCache';
import { assertValidCoordinates, fetchValidatedJson } from '@/services/http/fetchJson';
import { WeatherConditionKey } from '@/types';

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

export async function fetchWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'auto',
  forceRefresh: boolean = false
): Promise<ValidatedOpenMeteoWeather> {
  const { latRounded, lonRounded } = assertValidCoordinates(
    latitude,
    longitude,
    'open-meteo-weather'
  );
  const cacheKey = `weather:${latRounded}:${lonRounded}:${timezone}`;

  if (forceRefresh) {
    serverCache.delete(cacheKey);
  } else {
    const cached = serverCache.get<ValidatedOpenMeteoWeather>(cacheKey);
    if (cached) return cached;
  }

  const url = `${APP_CONFIG.openMeteoWeather.baseUrl}?latitude=${latRounded}&longitude=${lonRounded}&hourly=${APP_CONFIG.openMeteoWeather.hourlyParams}&current=${APP_CONFIG.openMeteoWeather.currentParams}&past_days=${APP_CONFIG.openMeteoWeather.pastDays}&forecast_days=${APP_CONFIG.openMeteoWeather.forecastDays}&timezone=${encodeURIComponent(timezone)}`;

  const data = await fetchValidatedJson(url, {
    provider: 'open-meteo-weather',
    label: 'Open-Meteo Weather API',
    timeoutMs: APP_CONFIG.openMeteoWeather.timeoutMs,
    maxRetries: APP_CONFIG.openMeteoWeather.maxRetries,
    schema: OpenMeteoWeatherResponseSchema,
    dedupKey: cacheKey,
  });

  serverCache.set(cacheKey, data, APP_CONFIG.cache.weatherTtlMs);
  return data;
}
