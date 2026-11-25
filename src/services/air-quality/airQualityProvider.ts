import { APP_CONFIG } from '@/lib/configuration/env';
import {
  OpenMeteoAirResponseSchema,
  ValidatedOpenMeteoAir,
} from '@/lib/validation/openMeteoSchemas';
import { serverCache } from '@/services/caching/ttlCache';
import { assertValidCoordinates, fetchValidatedJson } from '@/services/http/fetchJson';

export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  timezone: string = 'auto',
  forceRefresh: boolean = false
): Promise<ValidatedOpenMeteoAir> {
  const { latRounded, lonRounded } = assertValidCoordinates(latitude, longitude, 'open-meteo-air');
  const cacheKey = `aq:${latRounded}:${lonRounded}:${timezone}`;

  if (forceRefresh) {
    serverCache.delete(cacheKey);
  } else {
    const cached = serverCache.get<ValidatedOpenMeteoAir>(cacheKey);
    if (cached) return cached;
  }

  const url = `${APP_CONFIG.openMeteoAir.baseUrl}?latitude=${latRounded}&longitude=${lonRounded}&hourly=${APP_CONFIG.openMeteoAir.hourlyParams}&current=${APP_CONFIG.openMeteoAir.currentParams}&past_days=${APP_CONFIG.openMeteoAir.pastDays}&forecast_days=${APP_CONFIG.openMeteoAir.forecastDays}&timezone=${encodeURIComponent(timezone)}`;

  const data = await fetchValidatedJson(url, {
    provider: 'open-meteo-air',
    label: 'Open-Meteo Air Quality API',
    timeoutMs: APP_CONFIG.openMeteoAir.timeoutMs,
    maxRetries: APP_CONFIG.openMeteoAir.maxRetries,
    schema: OpenMeteoAirResponseSchema,
    dedupKey: cacheKey,
  });

  serverCache.set(cacheKey, data, APP_CONFIG.cache.airQualityTtlMs);
  return data;
}
