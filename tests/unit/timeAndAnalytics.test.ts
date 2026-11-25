import { describe, expect, it } from 'vitest';
import { detectEnvironmentalEvents } from '@/domain/analytics/eventDetection';
import { compareLocations } from '@/domain/analytics/locationComparison';
import { buildTrendAnalytics } from '@/domain/analytics/trendAnalysis';
import { calculateFreshness, parseOpenMeteoLocalTime } from '@/lib/time/timezone';
import { normalizeEnvironmentalSnapshot } from '@/services/environment/snapshotService';
import { ValidatedOpenMeteoAir } from '@/lib/validation/openMeteoSchemas';
import { GeoLocation } from '@/types';
import { toLanguageDisplayName } from '@/utils/languageUtils';
import { arithmeticMean, clamp, meanOf, meanOfRounded } from '@/utils/mathUtils';

function makeLocation(name: string, lat: number, lon: number, tz = 'Asia/Kolkata'): GeoLocation {
  return {
    id: 1,
    name,
    latitude: lat,
    longitude: lon,
    country: 'India',
    timezone: tz,
    countryCode: 'IN',
  };
}

function makeAirPayload(offsetSec = 19800): ValidatedOpenMeteoAir {
  const baseUtc = Date.UTC(2026, 10, 24, 0, 0) - offsetSec * 1000;
  const times = Array.from({ length: 72 }, (_, idx) => {
    const localMs = baseUtc + idx * 3600_000 + offsetSec * 1000;
    return new Date(localMs).toISOString().slice(0, 16);
  });

  const pm25 = times.map((_, idx) => (idx === 35 ? 115 : idx > 35 ? 95 : 42));
  const pm10 = times.map((_, idx) => (idx === 35 ? 260 : 80));
  const o3 = times.map((_, idx) => (idx % 24 >= 12 && idx % 24 <= 15 ? 125 : 45));

  return {
    latitude: 13.08,
    longitude: 80.27,
    utc_offset_seconds: offsetSec,
    timezone: 'Asia/Kolkata',
    timezone_abbreviation: 'IST',
    hourly_units: {
      pm10: 'μg/m³',
      pm2_5: 'μg/m³',
      carbon_monoxide: 'μg/m³',
      nitrogen_dioxide: 'μg/m³',
      sulphur_dioxide: 'μg/m³',
      ozone: 'μg/m³',
    },
    hourly: {
      time: times,
      pm10,
      pm2_5: pm25,
      carbon_monoxide: times.map(() => 500),
      nitrogen_dioxide: times.map(() => 24),
      sulphur_dioxide: times.map(() => 10),
      ozone: o3,
    },
  };
}

describe('Timezone Parsing, Event Detection, Trends & Location Comparison', () => {
  it('parses Open-Meteo naive local timestamps accurately using utc_offset_seconds', () => {
    const ist = parseOpenMeteoLocalTime('2026-11-25T14:30', 19800);
    expect(ist.utcIso).toBe('2026-11-25T09:00:00.000Z');
    expect(ist.localTime).toBe('2026-11-25T14:30');

    const est = parseOpenMeteoLocalTime('2026-11-25T09:00', -18000);
    expect(est.utcIso).toBe('2026-11-25T14:00:00.000Z');
  });

  it('classifies freshness accurately across thresholds', () => {
    const now = Date.parse('2026-11-25T12:00:00.000Z');
    expect(calculateFreshness('2026-11-25T11:30:00.000Z', 'MODEL_ESTIMATE', now).status).toBe(
      'FRESH'
    );
    expect(calculateFreshness('2026-11-25T10:00:00.000Z', 'MODEL_ESTIMATE', now).status).toBe(
      'STALE'
    );
    expect(calculateFreshness('2026-11-25T07:00:00.000Z', 'MODEL_ESTIMATE', now).status).toBe(
      'EXPIRED'
    );
    expect(calculateFreshness('invalid', 'MODEL_ESTIMATE', now).status).toBe('UNAVAILABLE');
  });

  it('detects spikes, category transitions, ozone peaks, and forecast deterioration responsibly', () => {
    const nowMs = Date.UTC(2026, 10, 25, 4, 30); // 10:00 IST (index 34)
    const snapshot = normalizeEnvironmentalSnapshot({
      airData: makeAirPayload(),
      weatherData: null,
      location: makeLocation('Chennai', 13.08, 80.27),
      nowMs,
    });

    const events = detectEnvironmentalEvents(snapshot.hourlyTimeline, 34);
    const types = new Set(events.map((e) => e.type));
    expect(types.has('PM25_SPIKE')).toBe(true);
    expect(types.has('PM10_SURGE')).toBe(true);
    expect(events.every((e) => e.possibleContributingFactors.length > 0)).toBe(true);

    const trends = buildTrendAnalytics(snapshot.hourlyTimeline);
    expect(trends.pastHoursCount).toBeGreaterThan(20);
    expect(trends.forecastHoursCount).toBeGreaterThan(20);
    expect(trends.trendDirection).toBe('WORSENING');
    expect(trends.dailySummaries.length).toBeGreaterThanOrEqual(3);
  });

  it('compares locations and warns on incompatible timestamps', () => {
    const snapA = normalizeEnvironmentalSnapshot({
      airData: makeAirPayload(),
      weatherData: null,
      location: makeLocation('Chennai', 13.08, 80.27),
      nowMs: Date.UTC(2026, 10, 25, 4, 30),
    });
    const snapB = normalizeEnvironmentalSnapshot({
      airData: makeAirPayload(),
      weatherData: null,
      location: makeLocation('Coimbatore', 11.0, 76.96),
      nowMs: Date.UTC(2026, 10, 25, 8, 30), // 4 hours drifted
    });

    const comparison = compareLocations([snapA, snapB], 'en');
    expect(comparison.locations.length).toBe(2);
    expect(comparison.timestampsCompatible).toBe(false);
    expect(comparison.timestampWarning).toContain('minutes');
  });

  it('computes shared math and language helpers consistently across domain modules', () => {
    expect(arithmeticMean([])).toBeNull();
    expect(meanOf([])).toBeNull();
    expect(meanOfRounded([])).toBeNull();
    expect(arithmeticMean([10.12, 20.14])).toBeCloseTo(15.13, 5);
    expect(meanOf([10.12, 20.14])).toBe(15.1);
    expect(meanOfRounded([10.12, 20.14])).toBe(15);
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);

    expect(toLanguageDisplayName('en')).toBe('English');
    expect(toLanguageDisplayName('ta')).toBe('Tamil');
    expect(toLanguageDisplayName('hi')).toBe('Hindi');
  });
});
