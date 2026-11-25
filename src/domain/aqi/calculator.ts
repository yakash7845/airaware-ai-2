/**
 * @module calculator
 * Top-level CPCB National Air Quality Index computation engine.
 *
 * Exports two functions:
 * - `computeCpcbNaqi`        — computes NAQI from a flat array of validated inputs
 * - `computeRollingCpcbNaqi` — computes rolling-window NAQI from a 2D hourly matrix
 *
 * Both functions are pure, deterministic, and side-effect-free. They handle all
 * edge cases explicitly: missing data, insufficient valid pollutants, clamped
 * concentrations, and sub-index ties.
 */
import { CalculationMethodology, ComputedAqi, PollutantId, PollutantSubIndexDetail } from '@/types';
import { getCpcbCategoryByValue } from './category';
import {
  CORE_SIX_POLLUTANTS,
  CPCB_MANDATORY_PARTICULATES,
  CPCB_MIN_VALID_POLLUTANTS,
  POLLUTANT_SPECS,
} from './constants';
import { resolveDominantPollutant } from './dominant-pollutant';
import { calculateSubIndexDetail } from './sub-index';
import { AqiComputeOptions, PollutantConcentrationInput, RollingHourlyPoint } from './types';
import { formatPollutantDisplay } from './units';
import { validatePollutantInput } from './validation';
import { arithmeticMean } from '@/utils/mathUtils';

/**
 * Compute CPCB National Air Quality Index deterministically from validated pollutant concentrations.
 *
 * Enforces:
 * - Minimum 3 valid pollutants (CPCB requirement)
 * - At least one of PM₂.₅ or PM₁₀ must be valid
 * - Missing values are never treated as zero
 * - Labels whether averaging windows meet 24h/8h CPCB requirements or are hourly indicative estimates
 *
 * @param inputs - Array of raw pollutant concentration inputs to be validated and interpolated.
 * @param options - Optional metadata: data source kind, source name, timestamp, and rolling-window flag.
 * @returns A fully populated ComputedAqi object; `value` is null if data is insufficient.
 */
export function computeCpcbNaqi(
  inputs: PollutantConcentrationInput[],
  options: AqiComputeOptions = {}
): ComputedAqi {
  const dataSourceKind = options.dataSourceKind ?? 'MODEL_ESTIMATE';
  const sourceName = options.sourceName ?? 'Open-Meteo CAMS Atmospheric Model';
  const observedAt = options.observedAt ?? new Date().toISOString();
  const isRollingAligned = options.isRollingWindowAligned ?? false;

  const subIndices: Partial<Record<PollutantId, number>> = {};
  const detailByPollutant = new Map<PollutantId, PollutantSubIndexDetail>();
  const limitations = new Set<string>(options.extraLimitations ?? []);

  let validCount = 0;
  let hasPm = false;
  let anyClamped = false;
  let anySubStandardHours = false;

  for (const rawInput of inputs) {
    const validated = validatePollutantInput(rawInput);
    if (!validated.valid) continue;

    const {
      pollutant,
      concentration,
      unit,
      averagingPeriod,
      hoursSampled,
      hoursRequired,
      warning,
    } = validated.data;
    if (warning) {
      anySubStandardHours = true;
    }

    const calc = calculateSubIndexDetail(pollutant, concentration);
    if (calc.subIndex === null) continue;

    if (calc.clampedAtMax) {
      anyClamped = true;
    }

    subIndices[pollutant] = calc.subIndex;
    validCount += 1;
    if (CPCB_MANDATORY_PARTICULATES.has(pollutant)) {
      hasPm = true;
    }

    detailByPollutant.set(pollutant, {
      pollutant,
      concentration: formatPollutantDisplay(pollutant, concentration),
      unit,
      averagingPeriod,
      hoursSampled,
      hoursRequired,
      subIndex: calc.subIndex,
      breakpointRange: calc.breakpointRange
        ? {
            concLow: calc.breakpointRange.concLow,
            concHigh: calc.breakpointRange.concHigh,
            aqiLow: calc.breakpointRange.aqiLow,
            aqiHigh: calc.breakpointRange.aqiHigh,
          }
        : null,
      isAvailable: true,
      limitationNote: warning,
    });
  }

  for (const pol of CORE_SIX_POLLUTANTS) {
    if (!detailByPollutant.has(pol)) {
      const spec = POLLUTANT_SPECS[pol];
      detailByPollutant.set(pol, {
        pollutant: pol,
        concentration: null,
        unit: spec.standardUnit,
        averagingPeriod: spec.averagingPeriod,
        hoursSampled: 0,
        hoursRequired: spec.hoursRequired,
        subIndex: null,
        breakpointRange: null,
        isAvailable: false,
        limitationNote: `${spec.formula} measurement unavailable for this slot.`,
      });
    }
  }

  const subIndexDetails = Array.from(detailByPollutant.values());
  const dataSufficient = validCount >= CPCB_MIN_VALID_POLLUTANTS && hasPm;

  if (dataSourceKind !== 'OBSERVED_STATION') {
    limitations.add(
      'Derived from regional CAMS atmospheric model estimates (~45 km global / ~11 km Europe grid), not a physical ground monitoring station.'
    );
  }

  if (!isRollingAligned || anySubStandardHours) {
    limitations.add(
      'Official CPCB NAQI specifies 24-hour averages (PM2.5, PM10, NO2, SO2) and 8-hour averages (CO, O3); values shown using shorter intervals are indicative estimates.'
    );
  }

  if (anyClamped) {
    limitations.add(
      'One or more pollutant concentrations exceeded the 500 AQI upper breakpoint and were capped at 500.'
    );
  }

  if (!dataSufficient) {
    limitations.add(
      'CPCB requires at least 3 valid pollutants including PM2.5 or PM10; overall NAQI cannot be computed.'
    );
    return {
      standard: 'IN_NAQI',
      value: null,
      categoryKey: null,
      categoryLabel: null,
      categoryColor: null,
      categoryTextColor: null,
      categoryPattern: 'solid',
      dominantPollutant: null,
      subIndices,
      subIndexDetails,
      methodology: 'UNAVAILABLE',
      methodDescription: `Insufficient criteria pollutants from ${sourceName} (valid=${validCount}, hasPM=${hasPm}).`,
      dataSourceKind,
      sourceName,
      observedAt,
      pollutantCount: validCount,
      hasPm,
      dataSufficient: false,
      limitations: Array.from(limitations),
    };
  }

  const { dominantPollutant, maxSubIndex, tiedPollutants } = resolveDominantPollutant(subIndices);
  const category = getCpcbCategoryByValue(maxSubIndex);

  if (tiedPollutants.length > 1) {
    limitations.add(
      `Sub-index tie at ${maxSubIndex} between ${tiedPollutants.map((p) => POLLUTANT_SPECS[p].formula).join(', ')}.`
    );
  }

  const methodology: CalculationMethodology =
    isRollingAligned && !anySubStandardHours
      ? 'CPCB_NAQI_ROLLING_MODEL'
      : 'CPCB_NAQI_INDICATIVE_HOURLY';

  const methodDescription =
    methodology === 'CPCB_NAQI_ROLLING_MODEL'
      ? `Indicative CPCB NAQI computed from ${sourceName} using 24h/8h rolling averages and CPCB 2014 breakpoints.`
      : `Indicative hourly CPCB NAQI estimate computed from ${sourceName} using CPCB 2014 breakpoints (single-hour or partial-window concentrations).`;

  return {
    standard: 'IN_NAQI',
    value: maxSubIndex,
    categoryKey: category?.key ?? null,
    categoryLabel: category?.name ?? null,
    categoryColor: category?.color ?? null,
    categoryTextColor: category?.textColor ?? null,
    categoryPattern: category?.pattern ?? 'solid',
    dominantPollutant,
    subIndices,
    subIndexDetails,
    methodology,
    methodDescription,
    dataSourceKind,
    sourceName,
    observedAt,
    pollutantCount: validCount,
    hasPm,
    dataSufficient: true,
    limitations: Array.from(limitations),
  };
}

/**
 * Compute CPCB-aligned rolling-window NAQI at `targetIndex` over a chronological hourly array.
 *
 * Uses trailing 24 hours for PM₂.₅, PM₁₀, NO₂, SO₂ (requiring ≥16 valid hours) and trailing
 * 8 hours for CO, O₃ (requiring ≥6 valid hours), matching CPCB 2014 Section 4.3.
 *
 * When fewer valid hours exist than required (e.g. at the start of a series), partial windows
 * are included but marked with `isRollingWindowAligned: false` so the caller can display an
 * appropriate "indicative estimate" notice rather than claiming full CPCB compliance.
 *
 * @param hourlySeries - 2D matrix: `hourlySeries[i]` is the array of pollutant readings at hour i.
 * @param targetIndex - The hour index for which to compute the rolling NAQI.
 * @param options - Optional metadata forwarded to `computeCpcbNaqi`.
 * @returns A ComputedAqi for the target slot, with appropriate methodology label.
 */
export function computeRollingCpcbNaqi(
  hourlySeries: ReadonlyArray<ReadonlyArray<RollingHourlyPoint>>,
  targetIndex: number,
  options: Omit<AqiComputeOptions, 'isRollingWindowAligned'> = {}
): ComputedAqi {
  if (targetIndex < 0 || targetIndex >= hourlySeries.length) {
    return computeCpcbNaqi([], options);
  }

  const rollingInputs: PollutantConcentrationInput[] = [];
  let allWindowsMeetCpcb = true;

  for (const pollutant of CORE_SIX_POLLUTANTS) {
    const spec = POLLUTANT_SPECS[pollutant];
    const windowStart = Math.max(0, targetIndex - spec.hoursRequired + 1);
    const slice = hourlySeries.slice(windowStart, targetIndex + 1);

    const validValues: number[] = [];
    let unit: string = spec.standardUnit;

    for (const slot of slice) {
      const point = slot.find((p) => p.pollutant === pollutant);
      if (point && point.value !== null && Number.isFinite(point.value) && point.value >= 0) {
        validValues.push(point.value);
        unit = point.unit;
      }
    }

    const meetsCpcbWindow = validValues.length >= spec.minValidHours;
    if (!meetsCpcbWindow) {
      allWindowsMeetCpcb = false;
    }

    const mean = arithmeticMean(validValues);
    if (mean !== null) {
      rollingInputs.push({
        pollutant,
        value: mean,
        unit,
        averagingPeriod: meetsCpcbWindow ? spec.averagingPeriod : '1h',
        hoursSampled: validValues.length,
        hoursRequired: spec.hoursRequired,
      });
    }
  }

  return computeCpcbNaqi(rollingInputs, {
    ...options,
    isRollingWindowAligned: allWindowsMeetCpcb,
  });
}
