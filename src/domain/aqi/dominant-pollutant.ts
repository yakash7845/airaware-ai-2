import { PollutantId } from '@/types';

export interface DominantPollutantResult {
  dominantPollutant: PollutantId | null;
  maxSubIndex: number | null;
  tiedPollutants: PollutantId[];
}

/**
 * Determine the overall AQI value (max of sub-indices) and the dominant/prominent pollutant.
 * When exact sub-index ties occur, prioritizes particulate matter (PM2.5 > PM10) deterministically.
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
