/**
 * @module eventDetection
 * Rule-based environmental event detection over AirAware hourly forecast timelines.
 *
 * All thresholds are expressed as named constants in EVENT_THRESHOLDS to ensure
 * transparency and testability. Events identify statistically significant changes
 * in CAMS atmospheric model data and list possible contributing factors without
 * asserting unverified local causes.
 *
 * Detected event types:
 * - PM25_SPIKE            — rapid fine-particle increase
 * - PM10_SURGE            — rapid coarse-particle increase
 * - CATEGORY_TRANSITION   — CPCB NAQI category boundary crossed upward
 * - RAPID_DETERIORATION   — NAQI worsens ≥35 points within 3 hours
 * - OZONE_PEAK            — daytime O₃ ≥100 µg/m³
 * - FORECAST_DETERIORATION— next-24h mean AQI ≥15% worse than trailing-24h mean
 */
import { EnvironmentalEvent, HourlySlot } from '@/types';
import { formatLocalHourLabel } from '@/lib/time/timezone';
import { arithmeticMean } from '@/utils/mathUtils';

/**
 * Transparent threshold constants for rule-based environmental event detection.
 * Event detection identifies statistical changes in CAMS data and lists possible
 * contributing factors without asserting unverified local causes.
 */
export const EVENT_THRESHOLDS = {
  pm25SpikePercent: 40,
  pm25SpikeAbsDelta: 15,
  pm25ElevatedAbsolute: 90,
  /** Absolute concentration above which a PM₂.₅ spike is classified HIGH severity. */
  pm25HighSeverityAbsolute: 120,
  pm10SurgePercent: 45,
  pm10SurgeAbsDelta: 35,
  pm10ElevatedAbsolute: 250,
  /** Absolute concentration above which a PM₁₀ surge is classified HIGH severity. */
  pm10HighSeverityAbsolute: 250,
  rapidAqiJumpPoints: 35,
  /** NAQI level above which category transitions, jumps, and trend shifts become HIGH severity. */
  aqiHighSeverityThreshold: 200,
  ozoneHighUgM3: 100,
  /** O₃ concentration above which an ozone peak is classified HIGH severity. */
  ozoneHighSeverityUgM3: 168,
  forecastDeteriorationPercent: 15,
} as const;

interface SurgeRule {
  pollutant: 'pm2_5' | 'pm10';
  type: 'PM25_SPIKE' | 'PM10_SURGE';
  titleKey: string;
  label: string;
  pctThreshold: number;
  absThreshold: number;
  elevatedThreshold: number;
  highSeverityThreshold: number;
  factors: string[];
}

const PARTICULATE_RULES: readonly SurgeRule[] = [
  {
    pollutant: 'pm2_5',
    type: 'PM25_SPIKE',
    titleKey: 'event.pm25Spike',
    label: 'PM₂.₅',
    pctThreshold: EVENT_THRESHOLDS.pm25SpikePercent,
    absThreshold: EVENT_THRESHOLDS.pm25SpikeAbsDelta,
    elevatedThreshold: EVENT_THRESHOLDS.pm25ElevatedAbsolute,
    highSeverityThreshold: EVENT_THRESHOLDS.pm25HighSeverityAbsolute,
    factors: [
      'Evening or early-morning boundary-layer cooling reducing vertical mixing',
      'Lower wind speeds limiting regional particle dispersion',
      'Diurnal urban combustion or regional plume transport',
    ],
  },
  {
    pollutant: 'pm10',
    type: 'PM10_SURGE',
    titleKey: 'event.pm10Surge',
    label: 'PM₁₀',
    pctThreshold: EVENT_THRESHOLDS.pm10SurgePercent,
    absThreshold: EVENT_THRESHOLDS.pm10SurgeAbsDelta,
    elevatedThreshold: EVENT_THRESHOLDS.pm10ElevatedAbsolute,
    highSeverityThreshold: EVENT_THRESHOLDS.pm10HighSeverityAbsolute,
    factors: [
      'Wind-driven dust resuspension under dry surface conditions',
      'Regional coarse aerosol transport in CAMS atmospheric grid',
    ],
  },
];

/**
 * Extract a specific pollutant's raw value from an hourly slot's measurement array.
 *
 * @param slot - The hourly slot to search.
 * @param id - The pollutant identifier to look up.
 * @returns The measurement value, or null if unavailable.
 */
function findPollutant(slot: HourlySlot, id: 'pm2_5' | 'pm10' | 'o3'): number | null {
  return slot.measurements.find((m) => m.pollutant === id)?.value ?? null;
}

/**
 * Evaluate a single particulate surge rule against the current and lookback hourly slots.
 *
 * @param rule - The surge detection rule (PM₂.₅ or PM₁₀).
 * @param slot - The current hourly slot being evaluated.
 * @param lookbackSlot - The slot 3 hours prior used to compute the delta.
 * @param index - Array index of the current slot (used to generate a stable event id).
 * @param hourLabel - Human-readable local time label for the event summary string.
 * @returns A populated EnvironmentalEvent if triggered, or null otherwise.
 */
function detectParticulateSurge(
  rule: SurgeRule,
  slot: HourlySlot,
  lookbackSlot: HourlySlot,
  index: number,
  hourLabel: string
): EnvironmentalEvent | null {
  const cur = findPollutant(slot, rule.pollutant);
  const base = findPollutant(lookbackSlot, rule.pollutant);
  if (cur === null || base === null || base <= 0) return null;

  const absDelta = cur - base;
  const pct = Math.round((absDelta / base) * 100);
  const triggered =
    (pct >= rule.pctThreshold && absDelta >= rule.absThreshold) ||
    (cur >= rule.elevatedThreshold && base < rule.elevatedThreshold);
  if (!triggered) return null;

  return {
    id: `evt-${rule.pollutant}-${index}`,
    type: rule.type,
    severity: cur >= rule.highSeverityThreshold ? 'HIGH' : 'ELEVATED',
    timestamp: slot.time,
    localTime: slot.localTime,
    isForecast: slot.isForecast,
    pollutant: rule.pollutant,
    previousValue: Number(base.toFixed(1)),
    currentValue: Number(cur.toFixed(1)),
    unit: 'µg/m³',
    deltaPercent: pct,
    thresholdDescription: `${rule.label} change ≥ +${rule.pctThreshold}% & +${rule.absThreshold} µg/m³ within 3h, or crossing ${rule.elevatedThreshold} µg/m³`,
    titleKey: rule.titleKey,
    summary: `${rule.label} rises from ${base.toFixed(1)} to ${cur.toFixed(1)} µg/m³ around ${hourLabel} (+${pct}%).`,
    possibleContributingFactors: rule.factors,
  };
}

/**
 * Check the current slot for NAQI category transitions and rapid deterioration events,
 * appending any detected events to the collector via `addEvent`.
 *
 * @param slot - The current hourly slot.
 * @param prevSlot - The immediately preceding hourly slot (1h back).
 * @param lookbackSlot - The slot 3 hours prior used to compute jump magnitude.
 * @param index - Array index of the current slot.
 * @param hourLabel - Human-readable local time label.
 * @param addEvent - Deduplication-aware event collector callback.
 */
function detectCategoryAndJumpEvents(
  slot: HourlySlot,
  prevSlot: HourlySlot,
  lookbackSlot: HourlySlot,
  index: number,
  hourLabel: string,
  addEvent: (evt: EnvironmentalEvent, key: string) => void
): void {
  const curAqi = slot.computedAqi?.value ?? null;
  const prevAqi = prevSlot.computedAqi?.value ?? null;
  const curCat = slot.computedAqi?.categoryLabel;
  const prevCat = prevSlot.computedAqi?.categoryLabel;

  if (
    curAqi !== null &&
    prevAqi !== null &&
    curCat &&
    prevCat &&
    curCat !== prevCat &&
    curAqi > prevAqi
  ) {
    addEvent(
      {
        id: `evt-cat-${index}`,
        type: 'CATEGORY_TRANSITION',
        severity: curAqi > EVENT_THRESHOLDS.aqiHighSeverityThreshold ? 'HIGH' : 'ELEVATED',
        timestamp: slot.time,
        localTime: slot.localTime,
        isForecast: slot.isForecast,
        previousValue: prevAqi,
        currentValue: curAqi,
        unit: 'IN NAQI',
        thresholdDescription: 'CPCB NAQI category tier transition upward',
        titleKey: 'event.categoryTransition',
        summary: `Indicative CPCB NAQI crosses from ${prevCat} (${prevAqi}) to ${curCat} (${curAqi}) near ${hourLabel}.`,
        possibleContributingFactors: [
          'Combined rise in dominant criteria pollutant concentration',
          'Changes in surface wind speed or diurnal mixing depth',
        ],
      },
      `CAT_${curCat}`
    );
  }

  const baseAqi = lookbackSlot.computedAqi?.value ?? null;
  if (
    curAqi !== null &&
    baseAqi !== null &&
    curAqi - baseAqi >= EVENT_THRESHOLDS.rapidAqiJumpPoints
  ) {
    addEvent(
      {
        id: `evt-rapid-${index}`,
        type: 'RAPID_DETERIORATION',
        severity: curAqi > EVENT_THRESHOLDS.aqiHighSeverityThreshold ? 'HIGH' : 'ELEVATED',
        timestamp: slot.time,
        localTime: slot.localTime,
        isForecast: slot.isForecast,
        previousValue: baseAqi,
        currentValue: curAqi,
        unit: 'IN NAQI',
        deltaPercent: baseAqi > 0 ? Math.round(((curAqi - baseAqi) / baseAqi) * 100) : undefined,
        thresholdDescription: `Indicative AQI increase ≥ +${EVENT_THRESHOLDS.rapidAqiJumpPoints} points within 3 hours`,
        titleKey: 'event.rapidDeterioration',
        summary: `Rapid deterioration detected: indicative NAQI rises by +${curAqi - baseAqi} points (${baseAqi} → ${curAqi}) by ${hourLabel}.`,
        possibleContributingFactors: [
          'Shallow atmospheric inversion or stagnant wind corridor',
          'Synchronized afternoon photochemical ozone or evening particulate buildup',
        ],
      },
      'RAPID_DETERIORATION'
    );
  }
}

/**
 * Detect a forecast deterioration event by comparing the next-24h mean AQI
 * against the trailing-24h mean. Returns null if data is insufficient.
 *
 * @param hourlyTimeline - Full chronological slot array.
 * @param currentIndex - Index of the slot representing "now".
 * @returns A FORECAST_DETERIORATION event, or null if threshold is not met.
 */
function detectForecastDeteriorationEvent(
  hourlyTimeline: readonly HourlySlot[],
  currentIndex: number
): EnvironmentalEvent | null {
  const pastSlice = hourlyTimeline.slice(Math.max(0, currentIndex - 23), currentIndex + 1);
  const futureSlice = hourlyTimeline.slice(currentIndex + 1, currentIndex + 25);
  const extractAqis = (slice: readonly HourlySlot[]) =>
    slice
      .map((s) => s.computedAqi?.value)
      .filter((v): v is number => v !== null && v !== undefined);

  const pastAqis = extractAqis(pastSlice);
  const futureAqis = extractAqis(futureSlice);
  if (pastAqis.length < 6 || futureAqis.length < 6) return null;

  const pastMean = arithmeticMean(pastAqis) ?? 0;
  const futureMean = arithmeticMean(futureAqis) ?? 0;
  const pctDiff = pastMean > 0 ? Math.round(((futureMean - pastMean) / pastMean) * 100) : 0;
  if (pctDiff < EVENT_THRESHOLDS.forecastDeteriorationPercent) return null;

  const firstFuture = futureSlice[0]!;
  return {
    id: 'evt-forecast-det',
    type: 'FORECAST_DETERIORATION',
    severity: futureMean > EVENT_THRESHOLDS.aqiHighSeverityThreshold ? 'HIGH' : 'ELEVATED',
    timestamp: firstFuture.time,
    localTime: firstFuture.localTime,
    isForecast: true,
    previousValue: Math.round(pastMean),
    currentValue: Math.round(futureMean),
    unit: 'IN NAQI',
    deltaPercent: pctDiff,
    thresholdDescription: `Next-24h forecast mean AQI ≥ +${EVENT_THRESHOLDS.forecastDeteriorationPercent}% above trailing 24h mean`,
    titleKey: 'event.forecastDeterioration',
    summary: `Next 24h forecast mean NAQI (${Math.round(futureMean)}) is ${pctDiff}% higher than the trailing 24h mean (${Math.round(pastMean)}).`,
    possibleContributingFactors: [
      'Projected lower wind ventilation in upcoming forecast period',
      'CAMS regional dispersion shift across the next diurnal cycle',
    ],
  };
}

/**
 * Detect a daytime photochemical ground-level ozone peak event for an hourly slot.
 *
 * @param slot - Hourly slot to evaluate.
 * @param index - Positional slot index used for deterministic event IDs.
 * @param hourNum - Local hour (0–23) restricting peaks to daytime insolation hours (11–17).
 * @param hourLabel - Formatted local hour label for summary copy.
 * @returns An `OZONE_PEAK` event when triggered, or `null` otherwise.
 */
function detectOzonePeakEvent(
  slot: HourlySlot,
  index: number,
  hourNum: number,
  hourLabel: string
): EnvironmentalEvent | null {
  const curO3 = findPollutant(slot, 'o3');
  if (curO3 === null || curO3 < EVENT_THRESHOLDS.ozoneHighUgM3 || hourNum < 11 || hourNum > 17) {
    return null;
  }

  return {
    id: `evt-o3-${index}`,
    type: 'OZONE_PEAK',
    severity: curO3 >= EVENT_THRESHOLDS.ozoneHighSeverityUgM3 ? 'HIGH' : 'ELEVATED',
    timestamp: slot.time,
    localTime: slot.localTime,
    isForecast: slot.isForecast,
    pollutant: 'o3',
    currentValue: Number(curO3.toFixed(1)),
    unit: 'µg/m³',
    thresholdDescription: `Daytime O₃ ≥ ${EVENT_THRESHOLDS.ozoneHighUgM3} µg/m³ (WHO 8h / CPCB Satisfactory boundary)`,
    titleKey: 'event.ozonePeak',
    summary: `Elevated daytime ground-level O₃ (${curO3.toFixed(1)} µg/m³) projected around ${hourLabel}.`,
    possibleContributingFactors: [
      'Strong midday solar radiation accelerating photochemical NO₂/VOC reactions',
      'Regional ozone advection during warm afternoon hours',
    ],
  };
}

/** Detect meaningful environmental events across the timeline around the current slot. */
export function detectEnvironmentalEvents(
  hourlyTimeline: readonly HourlySlot[],
  currentIndex: number
): EnvironmentalEvent[] {
  if (hourlyTimeline.length < 4 || currentIndex < 0 || currentIndex >= hourlyTimeline.length) {
    return [];
  }

  const events: EnvironmentalEvent[] = [];
  const seenKeys = new Set<string>();
  const addEvent = (evt: EnvironmentalEvent, dedupKey: string): void => {
    if (seenKeys.has(dedupKey)) return;
    seenKeys.add(dedupKey);
    events.push(evt);
  };

  const startIdx = Math.max(1, currentIndex - 6);
  const endIdx = Math.min(hourlyTimeline.length - 1, currentIndex + 24);

  for (let i = startIdx; i <= endIdx; i++) {
    const slot = hourlyTimeline[i];
    const prevSlot = hourlyTimeline[i - 1];
    if (!slot || !prevSlot) continue;

    const lookbackSlot = hourlyTimeline[Math.max(0, i - 3)] ?? prevSlot;
    const { hourLabel, hourNum } = formatLocalHourLabel(slot.localTime);

    for (const rule of PARTICULATE_RULES) {
      const surge = detectParticulateSurge(rule, slot, lookbackSlot, i, hourLabel);
      if (surge) addEvent(surge, rule.type);
    }

    detectCategoryAndJumpEvents(slot, prevSlot, lookbackSlot, i, hourLabel, addEvent);

    const ozoneEvt = detectOzonePeakEvent(slot, i, hourNum, hourLabel);
    if (ozoneEvt) addEvent(ozoneEvt, 'OZONE_PEAK');
  }

  const trendEvt = detectForecastDeteriorationEvent(hourlyTimeline, currentIndex);
  if (trendEvt) addEvent(trendEvt, 'FORECAST_DETERIORATION');

  return events.slice(0, 6);
}
