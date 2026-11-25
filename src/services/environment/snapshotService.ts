import {
  computeCpcbNaqi,
  computeRollingCpcbNaqi,
  convertConcentrationToCpcbUnit,
  formatPollutantDisplay,
  POLLUTANT_SPECS,
  RollingHourlyPoint,
} from '@/domain/aqi';
import { detectEnvironmentalEvents } from '@/domain/analytics/eventDetection';
import { buildTrendAnalytics } from '@/domain/analytics/trendAnalysis';
import { APP_CONFIG } from '@/lib/configuration/env';
import { calculateFreshness, parseOpenMeteoLocalTime } from '@/lib/time/timezone';
import {
  ValidatedOpenMeteoAir,
  ValidatedOpenMeteoWeather,
} from '@/lib/validation/openMeteoSchemas';
import { fetchAirQuality } from '@/services/air-quality/airQualityProvider';
import { fetchWeather, mapWmoWeatherCode } from '@/services/weather/weatherProvider';
import {
  AirSnapshot,
  CorePollutantId,
  DataSourceKind,
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

export function normalizeEnvironmentalSnapshot(params: {
  airData: ValidatedOpenMeteoAir;
  weatherData: ValidatedOpenMeteoWeather | null;
  location: GeoLocation;
  weatherFailed?: boolean;
  nowMs?: number;
}): AirSnapshot {
  const { airData, weatherData, location, weatherFailed = false, nowMs = Date.now() } = params;
  const fetchedAt = new Date(nowMs).toISOString();
  const offsetSec = airData.utc_offset_seconds;
  const rawTimes = airData.hourly.time;

  // Map hourly times to unambiguous UTC epochs & local wall strings
  const parsedTimes = rawTimes.map((t) => parseOpenMeteoLocalTime(t, offsetSec));

  // Locate current slot index closest to nowMs (preferring latest past/current hour)
  let currentIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < parsedTimes.length; i++) {
    const pt = parsedTimes[i];
    if (!pt) continue;
    const diff = Math.abs(nowMs - pt.epochMs);
    if (diff < minDiff) {
      minDiff = diff;
      currentIdx = i;
    }
  }

  // Index weather hourly slots by normalized local time for strict alignment
  const weatherByLocalTime = new Map<string, number>();
  let weatherCurrentIdx = 0;
  if (weatherData) {
    let wMinDiff = Infinity;
    for (let i = 0; i < weatherData.hourly.time.length; i++) {
      const wtRaw = weatherData.hourly.time[i];
      if (!wtRaw) continue;
      const wParsed = parseOpenMeteoLocalTime(wtRaw, weatherData.utc_offset_seconds);
      weatherByLocalTime.set(wParsed.localTime, i);
      const diff = Math.abs(nowMs - wParsed.epochMs);
      if (diff < wMinDiff) {
        wMinDiff = diff;
        weatherCurrentIdx = i;
      }
    }
  }

  // Build rolling point matrix + hourlyTimeline
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
      const arr = airData.hourly[key];
      const rawVal = arr[i];
      const rawUnit = airData.hourly_units[key] ?? 'µg/m³';
      if (rawVal === null || rawVal === undefined || !Number.isFinite(rawVal) || rawVal < 0) {
        continue;
      }
      const converted = convertConcentrationToCpcbUnit(id, rawVal, rawUnit);
      if (!converted) continue;

      slotRollingPoints.push({
        pollutant: id,
        value: converted.cpcbValue,
        unit: converted.unit,
      });

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
        location: {
          name: location.name,
          lat: airData.latitude,
          lon: airData.longitude,
        },
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

  const currentSlot = hourlyTimeline[currentIdx];
  const currentPt = parsedTimes[currentIdx]!;

  // Primary CPCB NAQI using trailing 24h/8h rolling averages over CAMS series
  const rollingAqi = computeRollingCpcbNaqi(rollingMatrix, currentIdx, {
    dataSourceKind: 'MODEL_ESTIMATE',
    sourceName: 'Open-Meteo CAMS Atmospheric Model',
    observedAt: currentPt.utcIso,
  });

  // Secondary single-hour indicative NAQI for full methodology transparency
  const hourlyIndicativeAqi =
    currentSlot?.computedAqi ??
    computeCpcbNaqi([], {
      dataSourceKind: 'MODEL_ESTIMATE',
      sourceName: 'Open-Meteo CAMS Atmospheric Model',
      observedAt: currentPt.utcIso,
    });

  // Attach rolling average details onto current measurements
  const currentMeasurements: Measurement[] = (currentSlot?.measurements ?? []).map((m) => {
    const detail = rollingAqi.subIndexDetails.find((d) => d.pollutant === m.pollutant);
    return {
      ...m,
      rollingAverageValue: detail?.concentration ?? null,
      rollingAverageHours: detail?.hoursSampled ?? 1,
      rollingPeriodRequired: POLLUTANT_SPECS[m.pollutant].averagingPeriod,
    };
  });

  // Build current weather contract (prefer Open-Meteo `current` block if available, else aligned hourly)
  let currentWeather: WeatherData | null = null;
  if (weatherData) {
    const wc = weatherData.current;
    const wHourly = weatherData.hourly;
    const wObserved = wc?.time
      ? parseOpenMeteoLocalTime(wc.time, weatherData.utc_offset_seconds)
      : currentPt;
    const wCode = wc?.weather_code ?? wHourly.weather_code?.[weatherCurrentIdx] ?? null;

    currentWeather = {
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

  const { status: freshness, humanAge } = calculateFreshness(
    currentPt.utcIso,
    'MODEL_ESTIMATE',
    nowMs
  );

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
  if (!rollingAqi.dataSufficient) {
    warnings.push(
      'Insufficient criteria pollutants for official CPCB NAQI threshold (requires ≥3 including PM₂.₅ or PM₁₀).'
    );
  }

  const events = detectEnvironmentalEvents(hourlyTimeline, currentIdx);
  const trendSummary = buildTrendAnalytics(hourlyTimeline);
  const hourlyForecast = hourlyTimeline.slice(currentIdx, currentIdx + 48);

  return {
    location: {
      ...location,
      timezone: airData.timezone || location.timezone,
    },
    current: currentMeasurements,
    supplementary: currentSlot?.supplementary ?? {},
    computedAqi: rollingAqi,
    hourlyIndicativeAqi,
    hourlyTimeline,
    hourlyForecast,
    weather: currentWeather,
    freshness,
    dataAge: humanAge,
    spatialResolutionNote:
      'Copernicus CAMS atmospheric model grid (~45 km global / ~11 km Europe). Regional model estimates cannot detect isolated street-corner or indoor sources.',
    warnings,
    events,
    trendSummary,
    sources: [
      {
        name: 'Open-Meteo Air Quality (Copernicus CAMS)',
        endpoint: APP_CONFIG.openMeteoAir.baseUrl,
        dataSourceKind: 'MODEL_ESTIMATE',
        attribution: APP_CONFIG.attribution.openMeteoAir,
      },
      ...(currentWeather
        ? [
            {
              name: 'Open-Meteo Weather Forecast',
              endpoint: APP_CONFIG.openMeteoWeather.baseUrl,
              dataSourceKind: 'FORECAST' as const,
              attribution: APP_CONFIG.attribution.openMeteoWeather,
            },
          ]
        : []),
    ],
    observedAt: currentPt.utcIso,
    localTime: currentPt.localTime,
    utcOffsetSeconds: offsetSec,
    fetchedAt,
  };
}

export async function getLocationAirSnapshot(params: {
  latitude: number;
  longitude: number;
  locationName: string;
  timezone?: string;
  forceRefresh?: boolean;
}): Promise<AirSnapshot> {
  const tz = params.timezone ?? 'auto';
  const [airResult, weatherResult] = await Promise.allSettled([
    fetchAirQuality(params.latitude, params.longitude, tz, params.forceRefresh),
    fetchWeather(params.latitude, params.longitude, tz, params.forceRefresh),
  ]);

  if (airResult.status === 'rejected') {
    throw airResult.reason;
  }

  const airData = airResult.value;
  const weatherData = weatherResult.status === 'fulfilled' ? weatherResult.value : null;

  return normalizeEnvironmentalSnapshot({
    airData,
    weatherData,
    weatherFailed: weatherResult.status === 'rejected',
    location: {
      id: 0,
      name: params.locationName,
      latitude: airData.latitude,
      longitude: airData.longitude,
      country: '',
      timezone: airData.timezone || tz,
      countryCode: '',
    },
  });
}
