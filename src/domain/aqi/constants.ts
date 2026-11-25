/**
 * @module constants
 * Official CPCB National Air Quality Index (2014) pollutant specifications.
 *
 * Each PollutantSpec includes:
 * - Averaging periods (24h for PM₂.₅/PM₁₀/NO₂/SO₂, 8h for CO/O₃)
 * - Minimum valid hours required for a compliant rolling average
 * - CPCB NAAQS 24h/8h standard limits and WHO 2021 guidelines
 * - Maximum physically plausible concentration for input validation
 *
 * Reference: CPCB, MoEFCC, Govt. of India — National Air Quality Index (October 2014).
 */
import { AveragingPeriod, CorePollutantId, PollutantId } from '@/types';

export interface PollutantSpec {
  readonly id: PollutantId;
  readonly label: string;
  readonly formula: string;
  readonly standardUnit: 'µg/m³' | 'mg/m³';
  readonly averagingPeriod: AveragingPeriod;
  readonly hoursRequired: number;
  readonly minValidHours: number;
  readonly naaqs24hOr8hLimit: number;
  readonly who2021Guideline24hOr8h: number | null;
  readonly maxPlausibleConcentration: number;
}

/**
 * Official CPCB National Air Quality Index (2014) pollutant specifications.
 * Averaging periods:
 * - 24-hour mean for PM2.5, PM10, NO2, SO2, NH3, Pb (CPCB requires >=16 valid hours for 24h mean)
 * - 8-hour mean for CO, O3 (CPCB requires >=6 valid hours for 8h mean)
 */
export const POLLUTANT_SPECS: Record<PollutantId, PollutantSpec> = {
  pm2_5: {
    id: 'pm2_5',
    label: 'Fine Particulate Matter (≤2.5 µm)',
    formula: 'PM₂.₅',
    standardUnit: 'µg/m³',
    averagingPeriod: '24h',
    hoursRequired: 24,
    minValidHours: 16,
    naaqs24hOr8hLimit: 60,
    who2021Guideline24hOr8h: 15,
    maxPlausibleConcentration: 2500,
  },
  pm10: {
    id: 'pm10',
    label: 'Coarse Particulate Matter (≤10 µm)',
    formula: 'PM₁₀',
    standardUnit: 'µg/m³',
    averagingPeriod: '24h',
    hoursRequired: 24,
    minValidHours: 16,
    naaqs24hOr8hLimit: 100,
    who2021Guideline24hOr8h: 45,
    maxPlausibleConcentration: 3500,
  },
  no2: {
    id: 'no2',
    label: 'Nitrogen Dioxide',
    formula: 'NO₂',
    standardUnit: 'µg/m³',
    averagingPeriod: '24h',
    hoursRequired: 24,
    minValidHours: 16,
    naaqs24hOr8hLimit: 80,
    who2021Guideline24hOr8h: 25,
    maxPlausibleConcentration: 2000,
  },
  so2: {
    id: 'so2',
    label: 'Sulphur Dioxide',
    formula: 'SO₂',
    standardUnit: 'µg/m³',
    averagingPeriod: '24h',
    hoursRequired: 24,
    minValidHours: 16,
    naaqs24hOr8hLimit: 80,
    who2021Guideline24hOr8h: 40,
    maxPlausibleConcentration: 4000,
  },
  co: {
    id: 'co',
    label: 'Carbon Monoxide',
    formula: 'CO',
    standardUnit: 'mg/m³',
    averagingPeriod: '8h',
    hoursRequired: 8,
    minValidHours: 6,
    naaqs24hOr8hLimit: 2.0,
    who2021Guideline24hOr8h: 4.0,
    maxPlausibleConcentration: 150,
  },
  o3: {
    id: 'o3',
    label: 'Ground-Level Ozone',
    formula: 'O₃',
    standardUnit: 'µg/m³',
    averagingPeriod: '8h',
    hoursRequired: 8,
    minValidHours: 6,
    naaqs24hOr8hLimit: 100,
    who2021Guideline24hOr8h: 100,
    maxPlausibleConcentration: 2000,
  },
  nh3: {
    id: 'nh3',
    label: 'Ammonia',
    formula: 'NH₃',
    standardUnit: 'µg/m³',
    averagingPeriod: '24h',
    hoursRequired: 24,
    minValidHours: 16,
    naaqs24hOr8hLimit: 400,
    who2021Guideline24hOr8h: null,
    maxPlausibleConcentration: 5000,
  },
  pb: {
    id: 'pb',
    label: 'Lead',
    formula: 'Pb',
    standardUnit: 'µg/m³',
    averagingPeriod: '24h',
    hoursRequired: 24,
    minValidHours: 16,
    naaqs24hOr8hLimit: 1.0,
    who2021Guideline24hOr8h: null,
    maxPlausibleConcentration: 50,
  },
};

export const CORE_SIX_POLLUTANTS: readonly CorePollutantId[] = [
  'pm2_5',
  'pm10',
  'co',
  'no2',
  'so2',
  'o3',
];

export const CPCB_MIN_VALID_POLLUTANTS = 3;
export const CPCB_MANDATORY_PARTICULATES: ReadonlySet<PollutantId> = new Set(['pm2_5', 'pm10']);
export const CPCB_REFERENCE_CITATION =
  'Central Pollution Control Board (CPCB), MoEFCC, Govt. of India — National Air Quality Index (October 2014).';
