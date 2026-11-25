/**
 * @module geocodingProvider
 * Server-cached Open-Meteo city geocoding search provider.
 */
import { APP_CONFIG } from '@/lib/configuration/env';
import { OpenMeteoGeoResponseSchema } from '@/lib/validation/openMeteoSchemas';
import { serverCache } from '@/services/caching/ttlCache';
import { fetchValidatedJson } from '@/services/http/fetchJson';
import { GeoLocation } from '@/types';

/**
 * Search worldwide locations matching a city query (minimum 2 characters),
 * caching normalized results for 24 hours.
 *
 * @param query - Sanitized city search query string.
 * @returns Array of matching {@link GeoLocation} records (empty if query < 2 chars).
 */
export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `geo:${trimmed.toLowerCase()}`;
  const cached = serverCache.get<GeoLocation[]>(cacheKey);
  if (cached) return cached;

  const url = `${APP_CONFIG.openMeteoGeo.baseUrl}?name=${encodeURIComponent(trimmed)}&count=${APP_CONFIG.openMeteoGeo.maxResults}&language=${APP_CONFIG.openMeteoGeo.language}&format=json`;

  const data = await fetchValidatedJson(url, {
    provider: 'open-meteo-geocoding',
    label: 'Open-Meteo Geocoding API',
    timeoutMs: APP_CONFIG.openMeteoGeo.timeoutMs,
    maxRetries: APP_CONFIG.openMeteoGeo.maxRetries,
    schema: OpenMeteoGeoResponseSchema,
    dedupKey: cacheKey,
  });

  const results = (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
    admin2: r.admin2,
    timezone: r.timezone || 'UTC',
    population: r.population,
    countryCode: r.country_code,
  }));

  serverCache.set(cacheKey, results, APP_CONFIG.cache.geocodingTtlMs);
  return results;
}
