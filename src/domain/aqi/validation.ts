/**
 * @module validation
 * Validates raw pollutant concentration inputs before CPCB NAQI computation.
 * Ensures unit compatibility, physical plausibility, and correct averaging periods.
 * Invalid values are rejected cleanly — missing data is never silently treated as zero.
 */
import { PollutantId } from '@/types';
import { POLLUTANT_SPECS } from './constants';
import { convertConcentrationToCpcbUnit } from './units';
import { PollutantConcentrationInput } from './types';

const VALID_POLLUTANT_IDS = new Set<string>(Object.keys(POLLUTANT_SPECS));

/**
 * Type-guard: returns true if `pollutant` is a recognised CPCB PollutantId.
 *
 * @param pollutant - Any string to test.
 * @returns `true` if the string matches a known PollutantId.
 */
export function isSupportedPollutant(pollutant: string): pollutant is PollutantId {
  return VALID_POLLUTANT_IDS.has(pollutant);
}

export interface ValidatedPollutantInput {
  pollutant: PollutantId;
  concentration: number;
  unit: string;
  averagingPeriod: '24h' | '8h' | '1h';
  hoursSampled: number;
  hoursRequired: number;
  warning?: string;
}

/**
 * Validate a pollutant reading for unit compatibility, non-negativity, finiteness, and physical bounds.
 * Missing or invalid values are rejected cleanly rather than treated as zero.
 */
export function validatePollutantInput(
  input: PollutantConcentrationInput
): { valid: true; data: ValidatedPollutantInput } | { valid: false; reason: string } {
  if (!isSupportedPollutant(input.pollutant)) {
    return { valid: false, reason: `Unsupported pollutant identifier "${input.pollutant}".` };
  }

  if (input.value === null || input.value === undefined || !Number.isFinite(input.value)) {
    return { valid: false, reason: `Missing or non-finite value for ${input.pollutant}.` };
  }

  if (input.value < 0) {
    return {
      valid: false,
      reason: `Negative concentration (${input.value}) is physically invalid.`,
    };
  }

  const converted = convertConcentrationToCpcbUnit(input.pollutant, input.value, input.unit);
  if (!converted) {
    return {
      valid: false,
      reason: `Incompatible unit "${input.unit}" for ${input.pollutant}. Expected ${POLLUTANT_SPECS[input.pollutant].standardUnit}.`,
    };
  }

  const spec = POLLUTANT_SPECS[input.pollutant];
  if (converted.cpcbValue > spec.maxPlausibleConcentration) {
    return {
      valid: false,
      reason: `Concentration ${converted.cpcbValue} ${converted.unit} exceeds physical plausibility limit (${spec.maxPlausibleConcentration}).`,
    };
  }

  const hoursRequired = input.hoursRequired ?? spec.hoursRequired;
  const hoursSampled = input.hoursSampled ?? 1;
  const averagingPeriod = input.averagingPeriod ?? spec.averagingPeriod;

  let warning: string | undefined;
  if (hoursSampled < spec.minValidHours) {
    warning = `${spec.formula} calculated from ${hoursSampled}h (CPCB standard recommends ${spec.averagingPeriod} mean with ≥${spec.minValidHours}h).`;
  }

  return {
    valid: true,
    data: {
      pollutant: input.pollutant,
      concentration: converted.cpcbValue,
      unit: converted.unit,
      averagingPeriod,
      hoursSampled,
      hoursRequired,
      warning,
    },
  };
}
