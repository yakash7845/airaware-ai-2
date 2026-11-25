import { computeCpcbNaqi, computeRollingCpcbNaqi, POLLUTANT_SPECS } from '@/domain/aqi';
import { detectEnvironmentalEvents } from '@/domain/analytics/eventDetection';
import { buildTrendAnalytics } from '@/domain/analytics/trendAnalysis';
import { APP_CONFIG } from '@/lib/configuration/env';
import { calculateFreshness, parseOpenMeteoLocalTime } from '@/lib/time/timezone';
import {
  ValidatedOpenMeteoAir,
  ValidatedOpenMeteoWeather,
} from '@/lib/validation/openMeteoSchemas';
import { fetchAirQuality } from '@/services/air-quality/airQualityProvider';
import { fetchWeather } from '@/services/weather/weatherProvider';
import { AirSnapshot, GeoLocation, Measurement } from '@/types';
import {
  buildCurrentWeather,
  buildHourlyTimeline,
  collectSnapshotWarnings,
  findClosestTimeIndex,
} from './snapshotBuilders';

/**
 * Normalize validated Open-Meteo atmospheric and weather feeds into a unified AirSnapshot
 * with rolling 24h/8h CPCB NAQI, 1h indicative breakdown, events, and trend analytics.
 */
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
  const parsedTimes = airData.hourly.time.map((t) => parseOpenMeteoLocalTime(t, offsetSec));
  const currentIdx = findClosestTimeIndex(parsedTimes, nowMs);

  const weatherByLocalTime = new Map<string, number>();
  let weatherCurrentIdx = 0;
  if (weatherData) {
    const wParsedTimes = weatherData.hourly.time.map((wtRaw) => {
      const parsed = parseOpenMeteoLocalTime(wtRaw, weatherData.utc_offset_seconds);
      return parsed;
    });
    wParsedTimes.forEach((wp, idx) => weatherByLocalTime.set(wp.localTime, idx));
    weatherCurrentIdx = findClosestTimeIndex(wParsedTimes, nowMs);
  }

  const { hourlyTimeline, rollingMatrix } = buildHourlyTimeline({
    airData,
    weatherData,
    weatherByLocalTime,
    parsedTimes,
    currentIdx,
    location,
    fetchedAt,
  });

  const currentSlot = hourlyTimeline[currentIdx];
  const currentPt = parsedTimes[currentIdx]!;

  const rollingAqi = computeRollingCpcbNaqi(rollingMatrix, currentIdx, {
    dataSourceKind: 'MODEL_ESTIMATE',
    sourceName: 'Open-Meteo CAMS Atmospheric Model',
    observedAt: currentPt.utcIso,
  });

  const hourlyIndicativeAqi =
    currentSlot?.computedAqi ??
    computeCpcbNaqi([], {
      dataSourceKind: 'MODEL_ESTIMATE',
      sourceName: 'Open-Meteo CAMS Atmospheric Model',
      observedAt: currentPt.utcIso,
    });

  const currentMeasurements: Measurement[] = (currentSlot?.measurements ?? []).map((m) => {
    const detail = rollingAqi.subIndexDetails.find((d) => d.pollutant === m.pollutant);
    return {
      ...m,
      rollingAverageValue: detail?.concentration ?? null,
      rollingAverageHours: detail?.hoursSampled ?? 1,
      rollingPeriodRequired: POLLUTANT_SPECS[m.pollutant].averagingPeriod,
    };
  });

  const currentWeather = buildCurrentWeather(weatherData, weatherCurrentIdx, currentPt);
  const { status: freshness, humanAge } = calculateFreshness(
    currentPt.utcIso,
    'MODEL_ESTIMATE',
    nowMs
  );

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
    hourlyForecast: hourlyTimeline.slice(currentIdx, currentIdx + 48),
    weather: currentWeather,
    freshness,
    dataAge: humanAge,
    spatialResolutionNote:
      'Copernicus CAMS atmospheric model grid (~45 km global / ~11 km Europe). Regional model estimates cannot detect isolated street-corner or indoor sources.',
    warnings: collectSnapshotWarnings(
      weatherFailed,
      freshness,
      humanAge,
      rollingAqi.dataSufficient
    ),
    events: detectEnvironmentalEvents(hourlyTimeline, currentIdx),
    trendSummary: buildTrendAnalytics(hourlyTimeline),
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

/** Fetch live Open-Meteo air quality and weather feeds concurrently and normalize them. */
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

  return normalizeEnvironmentalSnapshot({
    airData: airResult.value,
    weatherData: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
    weatherFailed: weatherResult.status === 'rejected',
    location: {
      id: 0,
      name: params.locationName,
      latitude: airResult.value.latitude,
      longitude: airResult.value.longitude,
      country: '',
      timezone: airResult.value.timezone || tz,
      countryCode: '',
    },
  });
}
