import { PollutantId } from '@/types';
import { CPCB_BREAKPOINTS } from './breakpoints';
import { POLLUTANT_SPECS } from './constants';
import { SubIndexCalculationResult } from './types';

/**
 * Calculate CPCB National AQI sub-index using linear piecewise interpolation:
 * Ip = [ (I_HI - I_LO) / (B_HI - B_LO) ] * (Cp - B_LO) + I_LO
 *
 * Bridges discrete CPCB integer presentation gaps (e.g. 30 < Cp < 31) continuously
 * so valid decimal concentrations never return null, and caps concentrations above
 * the Severe upper bound at 500 with an explicit clamped flag.
 */
export function calculateSubIndexDetail(
  pollutant: PollutantId,
  concentration: number
): SubIndexCalculationResult {
  const unit = POLLUTANT_SPECS[pollutant].standardUnit;

  if (!Number.isFinite(concentration) || concentration < 0) {
    return {
      pollutant,
      subIndex: null,
      normalizedValue: null,
      standardUnit: unit,
      breakpointRange: null,
      clampedAtMax: false,
      error: 'Concentration must be a finite non-negative number.',
    };
  }

  const ranges = CPCB_BREAKPOINTS[pollutant];
  if (!ranges || ranges.length === 0) {
    return {
      pollutant,
      subIndex: null,
      normalizedValue: null,
      standardUnit: unit,
      breakpointRange: null,
      clampedAtMax: false,
      error: 'No breakpoint ranges defined.',
    };
  }

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (!range) continue;

    if (concentration >= range.concLow && concentration <= range.concHigh) {
      const span = range.concHigh - range.concLow;
      const rawSub =
        span === 0
          ? range.aqiLow
          : ((range.aqiHigh - range.aqiLow) / span) * (concentration - range.concLow) +
            range.aqiLow;

      return {
        pollutant,
        subIndex: Math.round(rawSub),
        normalizedValue: concentration,
        standardUnit: unit,
        breakpointRange: range,
        clampedAtMax: false,
      };
    }

    const nextRange = ranges[i + 1];
    if (nextRange && concentration > range.concHigh && concentration < nextRange.concLow) {
      const gapSpan = nextRange.concLow - range.concHigh;
      const aqiSpan = nextRange.aqiLow - range.aqiHigh;
      const bridged = range.aqiHigh + (aqiSpan / gapSpan) * (concentration - range.concHigh);

      return {
        pollutant,
        subIndex: Math.round(bridged),
        normalizedValue: concentration,
        standardUnit: unit,
        breakpointRange: {
          concLow: range.concHigh,
          concHigh: nextRange.concLow,
          aqiLow: range.aqiHigh,
          aqiHigh: nextRange.aqiLow,
        },
        clampedAtMax: false,
      };
    }
  }

  const highest = ranges[ranges.length - 1]!;
  if (concentration > highest.concHigh) {
    return {
      pollutant,
      subIndex: 500,
      normalizedValue: concentration,
      standardUnit: unit,
      breakpointRange: highest,
      clampedAtMax: true,
    };
  }

  return {
    pollutant,
    subIndex: null,
    normalizedValue: null,
    standardUnit: unit,
    breakpointRange: null,
    clampedAtMax: false,
    error: 'Concentration outside supported breakpoint bounds.',
  };
}

export function calculateSubIndex(pollutant: PollutantId, concentration: number): number | null {
  return calculateSubIndexDetail(pollutant, concentration).subIndex;
}
