/**
 * @module units
 * Pollutant concentration unit normalization, CPCB unit conversion without premature
 * rounding, and consistent UI display formatting.
 */
import { PollutantId } from '@/types';
import { POLLUTANT_SPECS } from './constants';

const UNIT_ALIASES: Record<string, string> = {
  'ug/m3': 'µg/m³',
  'µg/m³': 'µg/m³',
  'μg/m³': 'µg/m³', // Greek mu (U+03BC) returned by Open-Meteo!
  'ug/m³': 'µg/m³',
  'mg/m3': 'mg/m³',
  'mg/m³': 'mg/m³',
  'µg/m3': 'µg/m³',
  'μg/m3': 'µg/m³',
};

/**
 * Normalize unit string variants (ASCII `"ug/m3"`, Greek `"μg/m³"`) to canonical symbols.
 *
 * @param rawUnit - Upstream unit label string.
 * @returns Canonical unit symbol string.
 */
export function normalizeUnitSymbol(rawUnit: string): string {
  const key = rawUnit.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? rawUnit.trim();
}

/**
 * Convert concentration to the exact unit required by CPCB NAQI tables without premature rounding.
 * CPCB requires mg/m³ for CO and µg/m³ for PM2.5, PM10, NO2, SO2, O3, NH3, Pb.
 *
 * @param pollutant - Target CPCB pollutant identifier.
 * @param value - Non-negative finite concentration value.
 * @param rawUnit - Source concentration unit label.
 * @returns Normalized `{ cpcbValue, unit }`, or `null` if input/unit is incompatible.
 */
export function convertConcentrationToCpcbUnit(
  pollutant: PollutantId,
  value: number,
  rawUnit: string
): { cpcbValue: number; unit: string } | null {
  if (!Number.isFinite(value) || value < 0) return null;

  const normalizedUnit = normalizeUnitSymbol(rawUnit);
  const expectedUnit = POLLUTANT_SPECS[pollutant].standardUnit;

  if (normalizedUnit === expectedUnit) {
    return { cpcbValue: value, unit: expectedUnit };
  }

  if (expectedUnit === 'mg/m³' && normalizedUnit === 'µg/m³') {
    return { cpcbValue: value / 1000, unit: 'mg/m³' };
  }

  if (expectedUnit === 'µg/m³' && normalizedUnit === 'mg/m³') {
    return { cpcbValue: value * 1000, unit: 'µg/m³' };
  }

  return null;
}

/** Format pollutant concentration consistently for user display after calculations. */
export function formatPollutantDisplay(pollutant: PollutantId, value: number): number {
  if (pollutant === 'co') {
    return Number(value.toFixed(2));
  }
  if (pollutant === 'pb') {
    return Number(value.toFixed(2));
  }
  return Number(value.toFixed(1));
}
