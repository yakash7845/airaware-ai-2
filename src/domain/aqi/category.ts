/**
 * @module category
 * CPCB National Air Quality Index category definitions with WCAG AA accessible
 * colour/pattern pairings. Status is never conveyed by colour alone.
 */
import { CpcbCategoryKey } from '@/types';
import { AqiCategorySpec } from './types';

/**
 * Official 6 CPCB National Air Quality Index categories (0–500).
 * Colors are paired with distinct visual patterns and WCAG AA accessible text colors
 * so status is never communicated by color alone.
 */
export const CPCB_CATEGORIES: readonly AqiCategorySpec[] = [
  {
    key: 'GOOD',
    name: 'Good',
    aqiLow: 0,
    aqiHigh: 50,
    color: '#15803d', // green-700 (AA contrast with white)
    textColor: '#ffffff',
    badgeBgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeTextClass: 'text-emerald-900 dark:text-emerald-200',
    badgeBorderClass: 'border-emerald-300 dark:border-emerald-700',
    pattern: 'solid',
    officialHealthImpact: 'Minimal impact.',
  },
  {
    key: 'SATISFACTORY',
    name: 'Satisfactory',
    aqiLow: 51,
    aqiHigh: 100,
    color: '#4d7c0f', // lime-700 (AA contrast with white)
    textColor: '#ffffff',
    badgeBgClass: 'bg-lime-50 dark:bg-lime-950/60',
    badgeTextClass: 'text-lime-900 dark:text-lime-200',
    badgeBorderClass: 'border-lime-300 dark:border-lime-700',
    pattern: 'dotted',
    officialHealthImpact: 'May cause minor breathing discomfort to sensitive people.',
  },
  {
    key: 'MODERATE',
    name: 'Moderately Polluted',
    aqiLow: 101,
    aqiHigh: 200,
    color: '#b45309', // amber-700 (AA contrast with white)
    textColor: '#ffffff',
    badgeBgClass: 'bg-amber-50 dark:bg-amber-950/60',
    badgeTextClass: 'text-amber-950 dark:text-amber-200',
    badgeBorderClass: 'border-amber-300 dark:border-amber-700',
    pattern: 'striped',
    officialHealthImpact:
      'May cause breathing discomfort to people with lung disease such as asthma, and discomfort to people with heart disease, children and older adults.',
  },
  {
    key: 'POOR',
    name: 'Poor',
    aqiLow: 201,
    aqiHigh: 300,
    color: '#c2410c', // orange-700 (AA contrast with white)
    textColor: '#ffffff',
    badgeBgClass: 'bg-orange-50 dark:bg-orange-950/60',
    badgeTextClass: 'text-orange-950 dark:text-orange-200',
    badgeBorderClass: 'border-orange-300 dark:border-orange-700',
    pattern: 'diagonal',
    officialHealthImpact:
      'May cause breathing discomfort to people on prolonged exposure, and discomfort to people with heart disease.',
  },
  {
    key: 'VERY_POOR',
    name: 'Very Poor',
    aqiLow: 301,
    aqiHigh: 400,
    color: '#b91c1c', // red-700 (AA contrast with white)
    textColor: '#ffffff',
    badgeBgClass: 'bg-rose-50 dark:bg-rose-950/60',
    badgeTextClass: 'text-rose-950 dark:text-rose-200',
    badgeBorderClass: 'border-rose-300 dark:border-rose-700',
    pattern: 'cross',
    officialHealthImpact:
      'May cause respiratory illness to the people on prolonged exposure. Effect may be more pronounced in people with lung and heart diseases.',
  },
  {
    key: 'SEVERE',
    name: 'Severe',
    aqiLow: 401,
    aqiHigh: 500,
    color: '#7f1d1d', // red-900 (AA contrast with white)
    textColor: '#ffffff',
    badgeBgClass: 'bg-red-100 dark:bg-red-950/80',
    badgeTextClass: 'text-red-950 dark:text-red-100',
    badgeBorderClass: 'border-red-400 dark:border-red-700',
    pattern: 'alert',
    officialHealthImpact:
      'May cause respiratory impact even on healthy people, and serious health impacts on people with lung/heart disease. Health impacts may be experienced even during light physical activity.',
  },
];

/**
 * Resolve the CPCB AQI category for a given numeric NAQI value.
 * Values above 500 are clamped to Severe; values below 0 or non-finite return null.
 *
 * @param aqi - The overall NAQI value (0–500), or null if data is insufficient.
 * @returns The matching AqiCategorySpec, or null for invalid input.
 */
export function getCpcbCategoryByValue(aqi: number | null): AqiCategorySpec | null {
  if (aqi === null || !Number.isFinite(aqi) || aqi < 0) return null;
  const rounded = Math.round(aqi);
  const found = CPCB_CATEGORIES.find((cat) => rounded >= cat.aqiLow && rounded <= cat.aqiHigh);
  if (found) return found;
  if (rounded > 500) return CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1] ?? null;
  return CPCB_CATEGORIES[0] ?? null;
}

/**
 * Resolve the CPCB AQI category by its string key (e.g. `'GOOD'`, `'SEVERE'`).
 *
 * @param key - The CpcbCategoryKey enum value, or null.
 * @returns The matching AqiCategorySpec, or null if the key is not found.
 */
export function getCpcbCategoryByKey(key: CpcbCategoryKey | null): AqiCategorySpec | null {
  if (!key) return null;
  return CPCB_CATEGORIES.find((cat) => cat.key === key) ?? null;
}
