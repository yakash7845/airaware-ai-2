/**
 * @module snapshotBuilders
 * Pure builder functions that transform validated Open-Meteo API responses into
 * the AirAware domain model (HourlySlot[], WeatherData, etc.).
 *
 * All functions are side-effect-free and independently testable. No network
 * calls, caching, or logging occurs here — those concerns live in snapshotService.
 */
import {
  computeCpcbNaqi,
  convertConcentrationToCpcbUnit,
  formatPollutantDisplay,
  POLLUTANT_SPECS,
  RollingHourlyPoint,
} from '@/domain/aqi';
import { APP_CONFIG } from '@/lib/configuration/env';
import { ParsedLocalTimestamp, parseOpenMeteoLocalTime } from '@/lib/time/timezone';
import {
  ValidatedOpenMeteoAir,
  ValidatedOpenMeteoWeather,
} from '@/lib/validation/openMeteoSchemas';
import { mapWmoWeatherCode } from '@/services/weather/weatherProvider';
import {
  CorePollutantId,
  DataSourceKind,
  FreshnessStatus,
  GeoLocation,
  HourlySlot,
  Measurement,
  WeatherData,
} from '@/types';

const POLLUTANT_MAP: ReadonlyArray<{
  id: CorePollutantId;
  key: 'pm2_5' | 'pm10' | 'carbon_monoxide' | 'nitrogen_dioxide' | 'sulphur_dioxide' | 'ozone';
}> = [
  { id: 'pm2_5', key: 'pm2_5' },
  { id: 'pm10', key: 'pm10' },
  { id: 'co', key: 'carbon_monoxide' },
  { id: 'no2', key: 'nitrogen_dioxide' },
  { id: 'so2', key: 'sulphur_dioxide' },
  { id: 'o3', key: 'ozone' },
];

/**
 * Locate the array index whose parsed timestamp is closest to `nowMs`.
 *
 * @param times - Chronological array of parsed local timestamps.
 * @param nowMs - The epoch millisecond value representing "now".
 * @returns The index in `times` with the smallest absolute time delta to `nowMs`.
 */
export function findClosestTimeIndex(
  times: readonly ParsedLocalTimestamp[],
  nowMs: number
): number {
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const pt = times[i];
    if (!pt) continue;
    const diff = Math.abs(nowMs - pt.epochMs);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

/**
 * Build the normalised hourly pollutant + aligned weather timeline and rolling CPCB matrix.
 *
 * For each hourly slot the function:
 * 1. Converts raw Open-Meteo units to CPCB standard units.
 * 2. Computes a 1h indicative NAQI for the slot.
 * 3. Aligns the nearest weather observation by local-time string key.
 * 4. Accumulates rolling-window input rows for downstream rolling NAQI computation.
 *
 * @param params.airData - Zod-validated Open-Meteo CAMS air quality response.
 * @param params.weatherData - Zod-validated Open-Meteo weather response, or null.
 * @param params.weatherByLocalTime - Pre-built map from local-time string to weather index.
 * @param params.parsedTimes - Parsed local timestamps corresponding to each air slot.
 * @param params.currentIdx - Index of the slot closest to the current wall-clock time.
 * @param params.location - Resolved GeoLocation for attribution metadata.
 * @param params.fetchedAt - ISO timestamp of when the upstream data was fetched.
 * @returns `{ hourlyTimeline, rollingMatrix }` — the full slot array and rolling input matrix.
 */
export function buildHourlyTimeline(params: {
  airData: ValidatedOpenMeteoAir;
  weatherData: ValidatedOpenMeteoWeather | null;
  weatherByLocalTime: Map<string, number>;
  parsedTimes: readonly ParsedLocalTimestamp[];
  currentIdx: number;
  location: GeoLocation;
  fetchedAt: string;
}): { hourlyTimeline: HourlySlot[]; rollingMatrix: RollingHourlyPoint[][] } {
  const { airData, weatherData, weatherByLocalTime, parsedTimes, currentIdx, location, fetchedAt } =
    params;
  const rollingMatrix: RollingHourlyPoint[][] = [];
  const hourlyTimeline: HourlySlot[] = [];

  for (let i = 0; i < parsedTimes.length; i++) {
    const pt = parsedTimes[i]!;
    const isForecast = i > currentIdx;
    const dataSourceKind: DataSourceKind =
      i === currentIdx ? 'MODEL_ESTIMATE' : isForecast ? 'FORECAST' : 'PAST_MODELLED';

    const slotMeasurements: Measurement[] = [];
    const slotRollingPoints: RollingHourlyPoint[] = [];

    for (const { id, key } of POLLUTANT_MAP) {
      const rawVal = airData.hourly[key][i];
      const rawUnit = airData.hourly_units[key] ?? 'µg/m³';
      if (rawVal === null || rawVal === undefined || !Number.isFinite(rawVal) || rawVal < 0) {
        continue;
      }
      const converted = convertConcentrationToCpcbUnit(id, rawVal, rawUnit);
      if (!converted) continue;

      slotRollingPoints.push({ pollutant: id, value: converted.cpcbValue, unit: converted.unit });
      slotMeasurements.push({
        pollutant: id,
        value: formatPollutantDisplay(id, converted.cpcbValue),
        unit: converted.unit,
        dataSourceKind,
        validationStatus: 'VALID',
        source: 'open-meteo',
        observedAt: pt.utcIso,
        localTime: pt.localTime,
        fetchedAt,
        location: { name: location.name, lat: airData.latitude, lon: airData.longitude },
        attribution: APP_CONFIG.attribution.openMeteoAir,
      });
    }

    rollingMatrix.push(slotRollingPoints);
    const slotComputedAqi =
      slotMeasurements.length > 0
        ? computeCpcbNaqi(
            slotRollingPoints.map((p) => ({
              pollutant: p.pollutant,
              value: p.value,
              unit: p.unit,
              averagingPeriod: '1h',
              hoursSampled: 1,
              hoursRequired: POLLUTANT_SPECS[p.pollutant].hoursRequired,
            })),
            {
              dataSourceKind,
              sourceName: 'Open-Meteo CAMS Atmospheric Model',
              observedAt: pt.utcIso,
              isRollingWindowAligned: false,
            }
          )
        : null;

    let slotWeather: HourlySlot['weather'];
    const wIdx = weatherByLocalTime.get(pt.localTime);
    if (weatherData && wIdx !== undefined) {
      const wCode = weatherData.hourly.weather_code?.[wIdx] ?? null;
      slotWeather = {
        temperature: Number((weatherData.hourly.temperature_2m[wIdx] ?? 0).toFixed(1)),
        humidity: Math.round(weatherData.hourly.relative_humidity_2m[wIdx] ?? 0),
        windSpeed: Number((weatherData.hourly.wind_speed_10m[wIdx] ?? 0).toFixed(1)),
        windDirection: Math.round(weatherData.hourly.wind_direction_10m[wIdx] ?? 0),
        precipitation: Number((weatherData.hourly.precipitation[wIdx] ?? 0).toFixed(1)),
        weatherCode: wCode,
        weatherCondition: mapWmoWeatherCode(wCode),
      };
    }

    hourlyTimeline.push({
      time: pt.utcIso,
      localTime: pt.localTime,
      isForecast,
      dataSourceKind,
      measurements: slotMeasurements,
      computedAqi: slotComputedAqi,
      weather: slotWeather,
      supplementary: {
        dustUgM3: airData.hourly.dust?.[i] ?? null,
        aerosolOpticalDepth: airData.hourly.aerosol_optical_depth?.[i] ?? null,
        uvIndex: airData.hourly.uv_index?.[i] ?? null,
        openMeteoUsAqi: airData.hourly.us_aqi?.[i] ?? null,
        openMeteoEuropeanAqi: airData.hourly.european_aqi?.[i] ?? null,
      },
    });
  }

  return { hourlyTimeline, rollingMatrix };
}

/** Build the canonical current weather contract from Open-Meteo `current` or aligned hourly slots. */
export function buildCurrentWeather(
  weatherData: ValidatedOpenMeteoWeather | null,
  weatherCurrentIdx: number,
  fallbackPoint: ParsedLocalTimestamp
): WeatherData | null {
  if (!weatherData) return null;
  const wc = weatherData.current;
  const wHourly = weatherData.hourly;
  const wObserved = wc?.time
    ? parseOpenMeteoLocalTime(wc.time, weatherData.utc_offset_seconds)
    : fallbackPoint;
  const wCode = wc?.weather_code ?? wHourly.weather_code?.[weatherCurrentIdx] ?? null;

  return {
    temperature: Number(
      (wc?.temperature_2m ?? wHourly.temperature_2m[weatherCurrentIdx] ?? 0).toFixed(1)
    ),
    apparentTemperature:
      wc?.apparent_temperature ?? wHourly.apparent_temperature?.[weatherCurrentIdx] ?? null,
    humidity: Math.round(
      wc?.relative_humidity_2m ?? wHourly.relative_humidity_2m[weatherCurrentIdx] ?? 0
    ),
    windSpeed: Number(
      (wc?.wind_speed_10m ?? wHourly.wind_speed_10m[weatherCurrentIdx] ?? 0).toFixed(1)
    ),
    windDirection: Math.round(
      wc?.wind_direction_10m ?? wHourly.wind_direction_10m[weatherCurrentIdx] ?? 0
    ),
    windGusts: wHourly.wind_gusts_10m?.[weatherCurrentIdx] ?? null,
    precipitation: Number(
      (wc?.precipitation ?? wHourly.precipitation[weatherCurrentIdx] ?? 0).toFixed(1)
    ),
    surfacePressure: wHourly.surface_pressure?.[weatherCurrentIdx] ?? null,
    visibilityMeters: wHourly.visibility?.[weatherCurrentIdx] ?? null,
    weatherCode: wCode,
    weatherCondition: mapWmoWeatherCode(wCode),
    isDay: wc?.is_day !== undefined && wc.is_day !== null ? wc.is_day === 1 : true,
    observedAt: wObserved.utcIso,
    localTime: wObserved.localTime,
    source: 'open-meteo',
    dataSourceKind: 'MODEL_ESTIMATE',
    attribution: APP_CONFIG.attribution.openMeteoWeather,
  };
}

/** Collect scientific transparency and data-availability warnings for a snapshot. */
export function collectSnapshotWarnings(
  weatherFailed: boolean,
  freshness: FreshnessStatus,
  humanAge: string,
  rollingDataSufficient: boolean
): string[] {
  const warnings: string[] = [];
  if (weatherFailed) {
    warnings.push(
      'Meteorological provider temporarily unavailable; air quality concentrations remain valid.'
    );
  }
  if (freshness === 'STALE') {
    warnings.push(`Latest CAMS atmospheric model slot is ${humanAge}.`);
  } else if (freshness === 'EXPIRED') {
    warnings.push('Atmospheric model data is more than 3 hours old.');
  }
  if (!rollingDataSufficient) {
    warnings.push(
      'Insufficient criteria pollutants for official CPCB NAQI threshold (requires ≥3 including PM₂.₅ or PM₁₀).'
    );
  }
  return warnings;
}
