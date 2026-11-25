/**
 * @module dominant-pollutant
 * Resolves the dominant pollutant from a set of CPCB NAQI sub-indices.
 * Uses a deterministic priority order to break ties without random behaviour.
 */
import { PollutantId } from '@/types';

/**
 * Result of resolving the dominant pollutant from a set of computed AQI sub-indices.
 * The dominant pollutant is the one whose sub-index equals the overall NAQI value.
 */
export interface DominantPollutantResult {
  /** The pollutant whose sub-index drives the overall NAQI, or null if data is insufficient. */
  dominantPollutant: PollutantId | null;
  /** The maximum sub-index value across all valid pollutants (= overall NAQI). */
  maxSubIndex: number | null;
  /** All pollutants sharing the maximum sub-index (empty unless there is a tie). */
  tiedPollutants: PollutantId[];
}

/**
 * Determine the overall NAQI value (max of sub-indices) and the dominant/prominent pollutant.
 *
 * Tie-breaking is deterministic: PM₂.₅ > PM₁₀ > O₃ > NO₂ > SO₂ > CO > NH₃ > Pb.
 * This mirrors the CPCB convention of prioritising fine particulate matter.
 *
 * @param subIndices - Map of computed pollutant sub-index values (may be partial).
 * @returns The dominant pollutant, the max sub-index, and any tied pollutants.
 */
export function resolveDominantPollutant(
  subIndices: Partial<Record<PollutantId, number>>
): DominantPollutantResult {
  const entries = Object.entries(subIndices) as [PollutantId, number][];
  if (entries.length === 0) {
    return { dominantPollutant: null, maxSubIndex: null, tiedPollutants: [] };
  }

  let maxSubIndex = -1;
  for (const [, val] of entries) {
    if (Number.isFinite(val) && val > maxSubIndex) {
      maxSubIndex = val;
    }
  }

  if (maxSubIndex < 0) {
    return { dominantPollutant: null, maxSubIndex: null, tiedPollutants: [] };
  }

  const tiedPollutants = entries.filter(([, val]) => val === maxSubIndex).map(([pol]) => pol);

  const priorityOrder: readonly PollutantId[] = [
    'pm2_5',
    'pm10',
    'o3',
    'no2',
    'so2',
    'co',
    'nh3',
    'pb',
  ];
  const dominantPollutant =
    priorityOrder.find((p) => tiedPollutants.includes(p)) ?? tiedPollutants[0] ?? null;

  return {
    dominantPollutant,
    maxSubIndex,
    tiedPollutants,
  };
}
