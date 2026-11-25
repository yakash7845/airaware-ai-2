import { describe, expect, it, vi } from 'vitest';
import { buildPollutionIntelligence } from '@/domain/analytics/pollutionIntelligence';
import { getCpcbHealthGuidance, getCpcbCategoryByKey } from '@/domain/aqi';
import { formatInTimezone, formatLocalHourLabel } from '@/lib/time/timezone';
import {
  buildDeterministicChatResponse,
  runGroundedAiAssistant,
} from '@/services/gemini/assistantService';
import {
  enrichBestWindowWithAi,
  enrichIndoorAdvisorWithAi,
  generateProfileGuidanceWithAi,
} from '@/services/gemini/enrichmentService';
import { normalizeEnvironmentalSnapshot } from '@/services/environment/snapshotService';
import { mapWmoWeatherCode } from '@/services/weather/weatherProvider';
import {
  ValidatedOpenMeteoAir,
  ValidatedOpenMeteoWeather,
} from '@/lib/validation/openMeteoSchemas';
import { evaluateOutdoorWindows } from '@/domain/recommendations/outdoorPlanner';
import {
  evaluateIndoorGuidance,
  DEFAULT_INDOOR_SETUP,
} from '@/domain/recommendations/indoorAdvisor';

function buildFixture() {
  const times = Array.from({ length: 72 }, (_, i) =>
    new Date(Date.UTC(2026, 10, 24, i, 0)).toISOString().slice(0, 16)
  );
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
      pm10: times.map(() => 75),
      pm2_5: times.map(() => 48),
      carbon_monoxide: times.map(() => 500),
      nitrogen_dioxide: times.map(() => 20),
      sulphur_dioxide: times.map(() => 10),
      ozone: times.map(() => 65),
    },
  };
  const weatherData: ValidatedOpenMeteoWeather = {
    latitude: 13.08,
    longitude: 80.27,
    utc_offset_seconds: 0,
    timezone: 'UTC',
    hourly_units: { temperature_2m: '°C' },
    hourly: {
      time: times,
      temperature_2m: times.map(() => 29.0),
      relative_humidity_2m: times.map(() => 68),
      precipitation: times.map(() => 0),
      weather_code: times.map(() => 0),
      wind_speed_10m: times.map(() => 11.0),
      wind_direction_10m: times.map(() => 90),
    },
  };
  return normalizeEnvironmentalSnapshot({
    airData,
    weatherData,
    location: {
      id: 1,
      name: 'Chennai',
      latitude: 13.08,
      longitude: 80.27,
      country: 'India',
      timezone: 'UTC',
      countryCode: 'IN',
    },
    nowMs: Date.UTC(2026, 10, 25, 10, 0),
  });
}

describe('Gemini Enrichment, WMO Weather, Localization & Time Helpers', () => {
  it('maps WMO weather codes cleanly across conditions', () => {
    expect(mapWmoWeatherCode(0)).toBe('CLEAR');
    expect(mapWmoWeatherCode(2)).toBe('PARTLY_CLOUDY');
    expect(mapWmoWeatherCode(3)).toBe('OVERCAST');
    expect(mapWmoWeatherCode(45)).toBe('FOG');
    expect(mapWmoWeatherCode(53)).toBe('DRIZZLE');
    expect(mapWmoWeatherCode(63)).toBe('RAIN');
    expect(mapWmoWeatherCode(95)).toBe('THUNDERSTORM');
    expect(mapWmoWeatherCode(null)).toBe('UNKNOWN');
  });

  it('builds multilingual pollution intelligence, health guidance, and deterministic chat fallbacks', () => {
    const snap = buildFixture();
    expect(buildPollutionIntelligence(snap, 'ta').headline).toContain('Chennai');
    expect(buildPollutionIntelligence(snap, 'hi').headline).toContain('Chennai');

    expect(getCpcbHealthGuidance('SEVERE', 'ta')).toContain('மாசு');
    expect(getCpcbHealthGuidance('GOOD', 'hi')).toContain('न्यूनतम');
    expect(getCpcbHealthGuidance(null, 'en')).toContain('Insufficient');
    expect(getCpcbCategoryByKey('MODERATE')?.name).toBe('Moderately Polluted');

    expect(formatInTimezone('2026-11-25T10:00:00.000Z', 'Asia/Kolkata', 'en-IN')).toBeTruthy();
    expect(formatLocalHourLabel('2026-11-25T15:30').hourLabel).toBe('3:30 PM');

    const taChat = buildDeterministicChatResponse({
      question: 'PM2.5 என்றால் என்ன?',
      primarySnapshot: snap,
      category: 'ADULT',
      language: 'ta',
    });
    expect(taChat.engineMode).toBe('DETERMINISTIC_FALLBACK');
    expect(taChat.answer).toContain('Chennai');

    const hiChat = buildDeterministicChatResponse({
      question: 'model vs observed',
      primarySnapshot: snap,
      category: 'ADULT',
      language: 'hi',
    });
    expect(hiChat.answer).toContain('CAMS');
  });

  it('uses valid grounded Gemini JSON responses when configured and safe', async () => {
    const snap = buildFixture();
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'fake-valid-test-key';

    const aqi = snap.computedAqi.value!;
    const pm25 = snap.current.find((m) => m.pollutant === 'pm2_5')!.value;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    answer: `Chennai currently shows an indicative CPCB NAQI of ${aqi} with PM2.5 at ${pm25} ug/m3.`,
                    summary: `Chennai: ${aqi} IN NAQI`,
                    relevantPollutants: [
                      {
                        pollutant: 'PM2.5',
                        value: `${pm25} ug/m3`,
                        interpretation: 'Satisfactory level',
                      },
                    ],
                    supportingData: [`IN NAQI: ${aqi}`],
                    practicalGuidance: ['Plan errands during comparatively lower forecast hours.'],
                    uncertainty: 'Regional CAMS atmospheric estimate.',
                    sources: ['Open-Meteo CAMS'],
                    followUpQuestions: ['What does the forecast indicate?'],
                  }),
                },
              ],
            },
          },
        ],
      });
    });

    const aiReply = await runGroundedAiAssistant({
      question: 'What is the current AQI?',
      primarySnapshot: snap,
      category: 'ADULT',
      language: 'en',
    });
    expect(aiReply.structured?.engineMode).toBe('GEMINI_GROUNDED');
    expect(aiReply.content).toContain(String(aqi));

    // Also test profile, planner, and indoor Gemini enrichment with valid JSON
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    headline: `Chennai Air Overview (${aqi})`,
                    summary: `Indicative IN NAQI is ${aqi}.`,
                    activityGuidance: 'Routine outdoor walks remain suitable.',
                    pollutantBreakdown: `PM2.5 is ${pm25} ug/m3.`,
                  }),
                },
              ],
            },
          },
        ],
      })
    );
    const enrichedProfile = await generateProfileGuidanceWithAi(snap, 'ADULT', 'en');
    expect(enrichedProfile.headline).toContain(String(aqi));

    const basePlan = evaluateOutdoorWindows({
      hourlySlots: snap.hourlyForecast,
      activity: 'WALKING',
      profileCategory: 'ADULT',
      language: 'en',
      locationName: 'Chennai',
    });
    const bestAqi = basePlan.bestWindow!.averageAqi!;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    headline: `Best Walk Window (${bestAqi})`,
                    recommendation: `Indicative NAQI averages ${bestAqi}.`,
                    activitySpecificAdvice: 'Prefer shaded park walking paths.',
                    cautionNote: 'Forecast estimates may shift with wind.',
                  }),
                },
              ],
            },
          },
        ],
      })
    );
    const enrichedPlan = await enrichBestWindowWithAi(basePlan);
    expect(enrichedPlan.aiEnriched).toBe(true);

    const baseIndoor = evaluateIndoorGuidance({
      setup: DEFAULT_INDOOR_SETUP,
      outdoorAqi: aqi,
      outdoorCategory: 'Satisfactory',
      dominantPollutant: 'pm2_5',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    headline: `Indoor Hygiene (${aqi})`,
                    overview: `Outdoor indicative NAQI is ${aqi}; no indoor sensor connected.`,
                    keyAction: 'Maintain clean indoor ventilation practices.',
                  }),
                },
              ],
            },
          },
        ],
      })
    );
    const enrichedIndoor = await enrichIndoorAdvisorWithAi(baseIndoor);
    expect(enrichedIndoor.aiEnriched).toBe(true);

    process.env.GEMINI_API_KEY = prevKey;
  });
});
