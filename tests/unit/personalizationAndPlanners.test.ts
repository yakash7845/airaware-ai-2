import { describe, expect, it } from 'vitest';
import { buildProfileGuidance } from '@/domain/personalization/guidanceEngine';
import {
  evaluateIndoorGuidance,
  DEFAULT_INDOOR_SETUP,
} from '@/domain/recommendations/indoorAdvisor';
import { evaluateOutdoorWindows } from '@/domain/recommendations/outdoorPlanner';
import { normalizeEnvironmentalSnapshot } from '@/services/environment/snapshotService';
import { ValidatedOpenMeteoAir } from '@/lib/validation/openMeteoSchemas';
import { ActivityType, ProfileCategory } from '@/types';

function createSnapshotFixture() {
  const times = Array.from({ length: 72 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 24, i, 0));
    return d.toISOString().slice(0, 16);
  });

  const airData: ValidatedOpenMeteoAir = {
    latitude: 13.08,
    longitude: 80.27,
    utc_offset_seconds: 0,
    timezone: 'UTC',
    timezone_abbreviation: 'UTC',
    hourly_units: {
      pm10: 'µg/m³',
      pm2_5: 'µg/m³',
      carbon_monoxide: 'µg/m³',
      nitrogen_dioxide: 'µg/m³',
      sulphur_dioxide: 'µg/m³',
      ozone: 'µg/m³',
    },
    hourly: {
      time: times,
      pm10: times.map((_, i) => 60 + (i % 24) * 4),
      pm2_5: times.map((_, i) => 35 + (i % 24) * 3),
      carbon_monoxide: times.map(() => 600),
      nitrogen_dioxide: times.map(() => 25),
      sulphur_dioxide: times.map(() => 12),
      ozone: times.map((_, i) => (i % 24 >= 12 && i % 24 <= 16 ? 130 : 45)),
    },
  };

  return normalizeEnvironmentalSnapshot({
    airData,
    weatherData: null,
    location: {
      id: 1,
      name: 'Chennai',
      latitude: 13.08,
      longitude: 80.27,
      country: 'India',
      timezone: 'UTC',
      countryCode: 'IN',
    },
    nowMs: Date.UTC(2026, 10, 25, 6, 0),
  });
}

describe('Personalization, Outdoor Planner & Indoor Advisor', () => {
  it('keeps environmental readings invariant across all 5 profile categories while adapting guidance', () => {
    const snap = createSnapshotFixture();
    const categories: ProfileCategory[] = ['CHILD', 'TEEN', 'ADULT', 'SENIOR', 'GENERAL'];
    const outputs = categories.map((cat) => buildProfileGuidance(snap, cat, 'en'));

    const baseAqis = new Set(outputs.map((o) => o.provenance.aqiValue));
    const distinctAdvice = new Set(outputs.map((o) => o.activityGuidance));
    expect(baseAqis.size).toBe(1);
    expect(distinctAdvice.size).toBe(5);

    const taOut = buildProfileGuidance(snap, 'SENIOR', 'ta');
    expect(taOut.summary).toMatch(/[\u0B80-\u0BFF]/);
    const hiOut = buildProfileGuidance(snap, 'CHILD', 'hi');
    expect(hiOut.summary).toMatch(/[\u0900-\u097F]/);
  });

  it('ranks outdoor activity windows across activities and rejects insufficient horizons', () => {
    const snap = createSnapshotFixture();
    const activities: ActivityType[] = [
      'WALKING',
      'CYCLING',
      'RUNNING',
      'OUTDOOR_SPORTS',
      'SCHOOL_COMMUTE',
      'OUTDOOR_RECREATION',
    ];

    for (const act of activities) {
      const plan = evaluateOutdoorWindows({
        hourlySlots: snap.hourlyForecast,
        activity: act,
        profileCategory: 'ADULT',
        language: 'en',
        locationName: 'Chennai',
      });
      expect(plan.dataSufficient).toBe(true);
      expect(plan.bestWindow?.rank).toBe(1);
      expect(plan.disclaimer.toLowerCase()).not.toContain('completely safe');
    }

    const insufficient = evaluateOutdoorWindows({
      hourlySlots: snap.hourlyForecast.slice(0, 2),
      activity: 'WALKING',
      profileCategory: 'ADULT',
      language: 'en',
      locationName: 'Chennai',
    });
    expect(insufficient.dataSufficient).toBe(false);
    expect(insufficient.bestWindow).toBeNull();
  });

  it('enforces strict non-sensor indoor disclaimers and indoor setup rules across languages', () => {
    const enPlan = evaluateIndoorGuidance({
      setup: {
        ...DEFAULT_INDOOR_SETUP,
        windowsStatus: 'OPEN',
        cookingNearby: 'YES',
        roadFacingArea: 'YES',
      },
      outdoorAqi: 185,
      outdoorCategory: 'Moderately Polluted',
      dominantPollutant: 'pm2_5',
      profileCategory: 'CHILD',
      language: 'en',
      locationName: 'Delhi',
    });

    expect(enPlan.infiltrationRiskLevel).toBe('MODERATE');
    expect(enPlan.disclaimer).toContain(
      'does not measure indoor air quality without a connected compatible indoor sensor'
    );
    expect(enPlan.suggestions.some((s) => s.category === 'VENTILATION')).toBe(true);
    expect(enPlan.suggestions.some((s) => s.category === 'COOKING_EXHAUST')).toBe(true);
    expect(enPlan.suggestions.some((s) => s.category === 'SENSOR_AWARENESS')).toBe(true);

    const taPlan = evaluateIndoorGuidance({
      setup: DEFAULT_INDOOR_SETUP,
      outdoorAqi: 90,
      outdoorCategory: 'Satisfactory',
      dominantPollutant: 'pm10',
      language: 'ta',
    });
    expect(taPlan.disclaimer).toContain('சென்சார் இல்லாமல்');
  });
});
