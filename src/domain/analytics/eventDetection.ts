import { EnvironmentalEvent, HourlySlot } from '@/types';
import { formatLocalHourLabel } from '@/lib/time/timezone';

/**
 * Transparent threshold constants for rule-based environmental event detection.
 * Note: Event detection identifies statistical changes in CAMS data and lists
 * possible contributing factors without asserting unverified local causes.
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

function findPollutant(slot: HourlySlot, id: 'pm2_5' | 'pm10' | 'o3'): number | null {
  return slot.measurements.find((m) => m.pollutant === id)?.value ?? null;
}

/**
 * Detect meaningful environmental events across the timeline around the current slot.
 */
export function detectEnvironmentalEvents(
  hourlyTimeline: readonly HourlySlot[],
  currentIndex: number
): EnvironmentalEvent[] {
  if (hourlyTimeline.length < 4 || currentIndex < 0 || currentIndex >= hourlyTimeline.length) {
    return [];
  }

  const events: EnvironmentalEvent[] = [];
  const seenKeys = new Set<string>();

  const addEvent = (evt: EnvironmentalEvent, dedupKey: string) => {
    if (seenKeys.has(dedupKey)) return;
    seenKeys.add(dedupKey);
    events.push(evt);
  };

  // Analyze window from 6 hours prior to 24 hours ahead
  const startIdx = Math.max(1, currentIndex - 6);
  const endIdx = Math.min(hourlyTimeline.length - 1, currentIndex + 24);

  for (let i = startIdx; i <= endIdx; i++) {
    const slot = hourlyTimeline[i];
    const prevSlot = hourlyTimeline[i - 1];
    if (!slot || !prevSlot) continue;

    const lookbackSlot = hourlyTimeline[Math.max(0, i - 3)] ?? prevSlot;
    const { hourLabel, hourNum } = formatLocalHourLabel(slot.localTime);

    // 1. PM2.5 spike detection
    const curPm25 = findPollutant(slot, 'pm2_5');
    const basePm25 = findPollutant(lookbackSlot, 'pm2_5');
    if (curPm25 !== null && basePm25 !== null && basePm25 > 0) {
      const absDelta = curPm25 - basePm25;
      const pct = Math.round((absDelta / basePm25) * 100);
      if (
        (pct >= EVENT_THRESHOLDS.pm25SpikePercent &&
          absDelta >= EVENT_THRESHOLDS.pm25SpikeAbsDelta) ||
        (curPm25 >= EVENT_THRESHOLDS.pm25ElevatedAbsolute &&
          basePm25 < EVENT_THRESHOLDS.pm25ElevatedAbsolute)
      ) {
        addEvent(
          {
            id: `evt-pm25-${i}`,
            type: 'PM25_SPIKE',
            severity: curPm25 >= 120 ? 'HIGH' : 'ELEVATED',
            timestamp: slot.time,
            localTime: slot.localTime,
            isForecast: slot.isForecast,
            pollutant: 'pm2_5',
            previousValue: Number(basePm25.toFixed(1)),
            currentValue: Number(curPm25.toFixed(1)),
            unit: 'µg/m³',
            deltaPercent: pct,
            thresholdDescription: `PM₂.₅ change ≥ +${EVENT_THRESHOLDS.pm25SpikePercent}% & +${EVENT_THRESHOLDS.pm25SpikeAbsDelta} µg/m³ within 3h, or crossing ${EVENT_THRESHOLDS.pm25ElevatedAbsolute} µg/m³`,
            titleKey: 'event.pm25Spike',
            summary: `PM₂.₅ shifts from ${basePm25.toFixed(1)} to ${curPm25.toFixed(1)} µg/m³ around ${hourLabel} (${pct >= 0 ? '+' : ''}${pct}%).`,
            possibleContributingFactors: [
              'Evening or early-morning boundary-layer cooling reducing vertical mixing',
              'Lower wind speeds limiting regional particle dispersion',
              'Diurnal urban combustion or regional plume transport',
            ],
          },
          'PM25_SPIKE'
        );
      }
    }

    // 2. PM10 surge detection
    const curPm10 = findPollutant(slot, 'pm10');
    const basePm10 = findPollutant(lookbackSlot, 'pm10');
    if (curPm10 !== null && basePm10 !== null && basePm10 > 0) {
      const absDelta = curPm10 - basePm10;
      const pct = Math.round((absDelta / basePm10) * 100);
      if (
        (pct >= EVENT_THRESHOLDS.pm10SurgePercent &&
          absDelta >= EVENT_THRESHOLDS.pm10SurgeAbsDelta) ||
        (curPm10 >= EVENT_THRESHOLDS.pm10ElevatedAbsolute &&
          basePm10 < EVENT_THRESHOLDS.pm10ElevatedAbsolute)
      ) {
        addEvent(
          {
            id: `evt-pm10-${i}`,
            type: 'PM10_SURGE',
            severity: curPm10 >= 250 ? 'HIGH' : 'ELEVATED',
            timestamp: slot.time,
            localTime: slot.localTime,
            isForecast: slot.isForecast,
            pollutant: 'pm10',
            previousValue: Number(basePm10.toFixed(1)),
            currentValue: Number(curPm10.toFixed(1)),
            unit: 'µg/m³',
            deltaPercent: pct,
            thresholdDescription: `PM₁₀ change ≥ +${EVENT_THRESHOLDS.pm10SurgePercent}% & +${EVENT_THRESHOLDS.pm10SurgeAbsDelta} µg/m³ within 3h, or crossing ${EVENT_THRESHOLDS.pm10ElevatedAbsolute} µg/m³`,
            titleKey: 'event.pm10Surge',
            summary: `PM₁₀ rises from ${basePm10.toFixed(1)} to ${curPm10.toFixed(1)} µg/m³ around ${hourLabel} (+${pct}%).`,
            possibleContributingFactors: [
              'Wind-driven dust resuspension under dry surface conditions',
              'Regional coarse aerosol transport in CAMS atmospheric grid',
            ],
          },
          'PM10_SURGE'
        );
      }
    }

    // 3. AQI category transition & rapid deterioration
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
          id: `evt-cat-${i}`,
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
          id: `evt-rapid-${i}`,
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

    // 4. Afternoon Ozone Peak
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

  // 5. Forecast deterioration comparison (next 24h mean vs trailing 24h mean)
  const pastSlice = hourlyTimeline.slice(Math.max(0, currentIndex - 23), currentIndex + 1);
  const futureSlice = hourlyTimeline.slice(currentIndex + 1, currentIndex + 25);
  const pastAqis = pastSlice
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);
  const futureAqis = futureSlice
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);

  if (pastAqis.length >= 6 && futureAqis.length >= 6) {
    const pastMean = pastAqis.reduce((a, b) => a + b, 0) / pastAqis.length;
    const futureMean = futureAqis.reduce((a, b) => a + b, 0) / futureAqis.length;
    const pctDiff = pastMean > 0 ? Math.round(((futureMean - pastMean) / pastMean) * 100) : 0;

    if (pctDiff >= EVENT_THRESHOLDS.forecastDeteriorationPercent) {
      const firstFuture = futureSlice[0]!;
      addEvent(
        {
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
        },
        'FORECAST_DETERIORATION'
      );
    }
  }

  return events.slice(0, 6);
}
