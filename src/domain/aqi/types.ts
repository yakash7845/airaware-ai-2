import { AveragingPeriod, CpcbCategoryKey, DataSourceKind, PollutantId } from '@/types';

export interface BreakpointRange {
  readonly aqiLow: number;
  readonly aqiHigh: number;
  readonly concLow: number;
  readonly concHigh: number;
}

export interface AqiCategorySpec {
  readonly key: CpcbCategoryKey;
  readonly name: string;
  readonly aqiLow: number;
  readonly aqiHigh: number;
  readonly color: string;
  readonly textColor: string;
  readonly badgeBgClass: string;
  readonly badgeTextClass: string;
  readonly badgeBorderClass: string;
  readonly pattern: 'solid' | 'striped' | 'dotted' | 'diagonal' | 'cross' | 'alert';
  readonly officialHealthImpact: string;
}

export interface PollutantConcentrationInput {
  pollutant: string;
  value: number | null | undefined;
  unit: string;
  averagingPeriod?: AveragingPeriod;
  hoursSampled?: number;
  hoursRequired?: number;
}

export interface SubIndexCalculationResult {
  pollutant: PollutantId;
  subIndex: number | null;
  normalizedValue: number | null;
  standardUnit: string;
  breakpointRange: BreakpointRange | null;
  clampedAtMax: boolean;
  error?: string;
}

export interface RollingHourlyPoint {
  pollutant: PollutantId;
  value: number | null;
  unit: string;
}

export interface AqiComputeOptions {
  dataSourceKind?: DataSourceKind;
  sourceName?: string;
  observedAt?: string;
  isRollingWindowAligned?: boolean;
  extraLimitations?: string[];
}
