import { EnvironmentalEvent, HourlySlot } from '@/types';
import { formatLocalHourLabel } from '@/lib/time/timezone';

/**
 * Transparent threshold constants for rule-based environmental event detection.
 * Event detection identifies statistical changes in CAMS data and lists possible
 * contributing factors without asserting unverified local causes.
 */
export const EVENT_THRESHOLDS = {
  pm25SpikePercent: 40,
  pm25SpikeAbsDelta: 15,
  pm25ElevatedAbsolute: 90,
  pm10SurgePercent: 45,
  pm10SurgeAbsDelta: 35,
  pm10ElevatedAbsolute: 250,
  rapidAqiJumpPoints: 35,
  ozoneHighUgM3: 100,
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
    highSeverityThreshold: 120,
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
    highSeverityThreshold: 250,
    factors: [
      'Wind-driven dust resuspension under dry surface conditions',
      'Regional coarse aerosol transport in CAMS atmospheric grid',
    ],
  },
];

function findPollutant(slot: HourlySlot, id: 'pm2_5' | 'pm10' | 'o3'): number | null {
  return slot.measurements.find((m) => m.pollutant === id)?.value ?? null;
}

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
        severity: curAqi > 200 ? 'HIGH' : 'ELEVATED',
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
        severity: curAqi > 200 ? 'HIGH' : 'ELEVATED',
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

  const pastMean = pastAqis.reduce((a, b) => a + b, 0) / pastAqis.length;
  const futureMean = futureAqis.reduce((a, b) => a + b, 0) / futureAqis.length;
  const pctDiff = pastMean > 0 ? Math.round(((futureMean - pastMean) / pastMean) * 100) : 0;
  if (pctDiff < EVENT_THRESHOLDS.forecastDeteriorationPercent) return null;

  const firstFuture = futureSlice[0]!;
  return {
    id: 'evt-forecast-det',
    type: 'FORECAST_DETERIORATION',
    severity: futureMean > 200 ? 'HIGH' : 'ELEVATED',
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

    const curO3 = findPollutant(slot, 'o3');
    if (
      curO3 !== null &&
      curO3 >= EVENT_THRESHOLDS.ozoneHighUgM3 &&
      hourNum >= 11 &&
      hourNum <= 17
    ) {
      addEvent(
        {
          id: `evt-o3-${i}`,
          type: 'OZONE_PEAK',
          severity: curO3 >= 168 ? 'HIGH' : 'ELEVATED',
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
        },
        'OZONE_PEAK'
      );
    }
  }

  const trendEvt = detectForecastDeteriorationEvent(hourlyTimeline, currentIndex);
  if (trendEvt) addEvent(trendEvt, 'FORECAST_DETERIORATION');

  return events.slice(0, 6);
}
