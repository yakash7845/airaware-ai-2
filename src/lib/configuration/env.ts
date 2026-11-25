import { z } from 'zod';

const HttpsUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith('https://'), 'Upstream provider endpoints must use HTTPS.');

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().min(1).optional().default('gemini-2.0-flash'),
  OPEN_METEO_AIR_URL: HttpsUrlSchema.optional().default(
    'https://air-quality-api.open-meteo.com/v1/air-quality'
  ),
  OPEN_METEO_WEATHER_URL: HttpsUrlSchema.optional().default(
    'https://api.open-meteo.com/v1/forecast'
  ),
  OPEN_METEO_GEO_URL: HttpsUrlSchema.optional().default(
    'https://geocoding-api.open-meteo.com/v1/search'
  ),
  AIR_QUALITY_CACHE_TTL_MS: z.coerce.number().int().positive().optional().default(600_000),
  WEATHER_CACHE_TTL_MS: z.coerce.number().int().positive().optional().default(900_000),
  GEOCODING_CACHE_TTL_MS: z.coerce.number().int().positive().optional().default(86_400_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional().default(60_000),
  RATE_LIMIT_STANDARD_MAX: z.coerce.number().int().positive().optional().default(60),
  RATE_LIMIT_AI_MAX: z.coerce.number().int().positive().optional().default(20),
});

function loadValidatedEnv() {
  const parsed = EnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || undefined,
    OPEN_METEO_AIR_URL: process.env.OPEN_METEO_AIR_URL?.trim() || undefined,
    OPEN_METEO_WEATHER_URL: process.env.OPEN_METEO_WEATHER_URL?.trim() || undefined,
    OPEN_METEO_GEO_URL: process.env.OPEN_METEO_GEO_URL?.trim() || undefined,
    AIR_QUALITY_CACHE_TTL_MS: process.env.AIR_QUALITY_CACHE_TTL_MS || undefined,
    WEATHER_CACHE_TTL_MS: process.env.WEATHER_CACHE_TTL_MS || undefined,
    GEOCODING_CACHE_TTL_MS: process.env.GEOCODING_CACHE_TTL_MS || undefined,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || undefined,
    RATE_LIMIT_STANDARD_MAX: process.env.RATE_LIMIT_STANDARD_MAX || undefined,
    RATE_LIMIT_AI_MAX: process.env.RATE_LIMIT_AI_MAX || undefined,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return EnvSchema.parse({});
}

export const ENV = loadValidatedEnv();

export const APP_CONFIG = {
  openMeteoAir: {
    baseUrl: ENV.OPEN_METEO_AIR_URL,
    hourlyParams: [
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'dust',
      'aerosol_optical_depth',
      'uv_index',
      'us_aqi',
      'european_aqi',
    ].join(','),
    currentParams: [
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'us_aqi',
      'european_aqi',
    ].join(','),
    pastDays: 2,
    forecastDays: 3,
    timeoutMs: 9_000,
    maxRetries: 2,
  },
  openMeteoWeather: {
    baseUrl: ENV.OPEN_METEO_WEATHER_URL,
    hourlyParams: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'surface_pressure',
      'visibility',
    ].join(','),
    currentParams: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
    ].join(','),
    pastDays: 2,
    forecastDays: 3,
    timeoutMs: 9_000,
    maxRetries: 2,
  },
  openMeteoGeo: {
    baseUrl: ENV.OPEN_METEO_GEO_URL,
    maxResults: 10,
    language: 'en',
    timeoutMs: 6_000,
    maxRetries: 1,
  },
  gemini: {
    model: ENV.GEMINI_MODEL,
    endpointBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    timeoutMs: 8_000,
    maxRetries: 1,
    maxOutputTokens: 900,
  },
  cache: {
    airQualityTtlMs: ENV.AIR_QUALITY_CACHE_TTL_MS,
    weatherTtlMs: ENV.WEATHER_CACHE_TTL_MS,
    geocodingTtlMs: ENV.GEOCODING_CACHE_TTL_MS,
    maxEntries: 600,
  },
  freshness: {
    stationFreshMs: 45 * 60 * 1000,
    modelFreshMs: 75 * 60 * 1000,
    modelStaleMs: 3 * 60 * 60 * 1000,
  },
  rateLimit: {
    windowMs: ENV.RATE_LIMIT_WINDOW_MS,
    standardMax: ENV.RATE_LIMIT_STANDARD_MAX,
    aiMax: ENV.RATE_LIMIT_AI_MAX,
  },
  security: {
    maxJsonBodyBytes: 256 * 1024,
    maxCompareLocations: 4,
    maxQuestionLength: 800,
  },
  coordinates: {
    minLat: -90,
    maxLat: 90,
    minLon: -180,
    maxLon: 180,
  },
  attribution: {
    openMeteoAir: 'Air quality data by Open-Meteo.com (Copernicus CAMS data, CC BY 4.0)',
    openMeteoWeather: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    openMeteoGeo: 'Geocoding by Open-Meteo.com (GeoNames)',
    openStreetMap: 'Map tiles © OpenStreetMap contributors (ODbL)',
    cpcb: 'CPCB National Air Quality Index methodology (MoEFCC, Oct 2014)',
  },
} as const;

export function getServerGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim() ?? ENV.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return '';
  }
  return key;
}
