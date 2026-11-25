/**
 * @module openMeteoSchemas
 * Runtime Zod schemas validating upstream Open-Meteo air quality, weather, and
 * geocoding payloads before data enters domain calculations.
 */
import { z } from 'zod';

const NumericOrNullArray = z.array(z.number().finite().nullable());

export const OpenMeteoAirResponseSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  generationtime_ms: z.number().finite().optional(),
  utc_offset_seconds: z.number().int(),
  timezone: z.string(),
  timezone_abbreviation: z.string().optional().default('UTC'),
  elevation: z.number().finite().optional(),
  current: z
    .object({
      time: z.string(),
      pm10: z.number().finite().nullable().optional(),
      pm2_5: z.number().finite().nullable().optional(),
      carbon_monoxide: z.number().finite().nullable().optional(),
      nitrogen_dioxide: z.number().finite().nullable().optional(),
      sulphur_dioxide: z.number().finite().nullable().optional(),
      ozone: z.number().finite().nullable().optional(),
      us_aqi: z.number().finite().nullable().optional(),
      european_aqi: z.number().finite().nullable().optional(),
    })
    .optional(),
  hourly_units: z.record(z.string(), z.string()),
  hourly: z.object({
    time: z.array(z.string()).min(1),
    pm10: NumericOrNullArray,
    pm2_5: NumericOrNullArray,
    carbon_monoxide: NumericOrNullArray,
    nitrogen_dioxide: NumericOrNullArray,
    sulphur_dioxide: NumericOrNullArray,
    ozone: NumericOrNullArray,
    dust: NumericOrNullArray.optional(),
    aerosol_optical_depth: NumericOrNullArray.optional(),
    uv_index: NumericOrNullArray.optional(),
    us_aqi: NumericOrNullArray.optional(),
    european_aqi: NumericOrNullArray.optional(),
  }),
});

export type ValidatedOpenMeteoAir = z.infer<typeof OpenMeteoAirResponseSchema>;

export const OpenMeteoWeatherResponseSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  utc_offset_seconds: z.number().int(),
  timezone: z.string(),
  current: z
    .object({
      time: z.string(),
      temperature_2m: z.number().finite().nullable().optional(),
      relative_humidity_2m: z.number().finite().nullable().optional(),
      apparent_temperature: z.number().finite().nullable().optional(),
      precipitation: z.number().finite().nullable().optional(),
      weather_code: z.number().finite().nullable().optional(),
      wind_speed_10m: z.number().finite().nullable().optional(),
      wind_direction_10m: z.number().finite().nullable().optional(),
      is_day: z.number().finite().nullable().optional(),
    })
    .optional(),
  hourly_units: z.record(z.string(), z.string()),
  hourly: z.object({
    time: z.array(z.string()).min(1),
    temperature_2m: NumericOrNullArray,
    relative_humidity_2m: NumericOrNullArray,
    apparent_temperature: NumericOrNullArray.optional(),
    precipitation: NumericOrNullArray,
    weather_code: NumericOrNullArray.optional(),
    wind_speed_10m: NumericOrNullArray,
    wind_direction_10m: NumericOrNullArray,
    wind_gusts_10m: NumericOrNullArray.optional(),
    surface_pressure: NumericOrNullArray.optional(),
    visibility: NumericOrNullArray.optional(),
  }),
});

export type ValidatedOpenMeteoWeather = z.infer<typeof OpenMeteoWeatherResponseSchema>;

export const OpenMeteoGeoResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        latitude: z.number().finite(),
        longitude: z.number().finite(),
        country: z.string().optional().default('Unknown'),
        country_code: z.string().optional().default(''),
        admin1: z.string().optional(),
        admin2: z.string().optional(),
        timezone: z.string().optional().default('UTC'),
        population: z.number().finite().optional(),
      })
    )
    .optional(),
});

export type ValidatedOpenMeteoGeo = z.infer<typeof OpenMeteoGeoResponseSchema>;
