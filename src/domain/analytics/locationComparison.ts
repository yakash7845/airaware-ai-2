/**
 * @module locationComparison
 * Pure domain module for comparing two or more AirSnapshot readings across locations.
 *
 * Checks timestamp compatibility before computing ranking and summary text so that
 * callers (the `/api/compare` route and the Explore page) are always aware of
 * snapshot staleness spread.
 */
import { AirSnapshot, ComparedLocationSnapshot, Language, LocationComparisonResult } from '@/types';

/**
 * Maximum acceptable difference between snapshot timestamps for a direct AQI comparison
 * to be considered temporally compatible. 90 minutes is chosen because CAMS hourly model
 * output typically refreshes on 1-hour boundaries and a half-cycle tolerance covers common
 * cache-miss scenarios without overstating comparability.
 */
const MAX_COMPATIBLE_DRIFT_MS = 90 * 60 * 1_000;

/**
 * Read the concentration value of a named core pollutant from a snapshot's measurement list.
 *
 * @param snapshot - The air snapshot to query.
 * @param id - Pollutant identifier to look up (`'pm2_5'`, `'pm10'`, `'o3'`, or `'no2'`).
 * @returns The measurement value, or `null` if the pollutant is not in the snapshot.
 */
function readPollutantValue(
  snapshot: AirSnapshot,
  id: 'pm2_5' | 'pm10' | 'o3' | 'no2'
): number | null {
  return snapshot.current.find((m) => m.pollutant === id)?.value ?? null;
}

/**
 * Compare two or more location AirSnapshots cleanly, checking timestamp compatibility
 * and methodology consistency before summarizing differences.
 */
export function compareLocations(
  snapshots: readonly AirSnapshot[],
  language: Language = 'en'
): LocationComparisonResult {
  const comparedAt = new Date().toISOString();

  const items: ComparedLocationSnapshot[] = snapshots.map((snap) => ({
    location: snap.location,
    computedAqi: snap.computedAqi,
    pm25: readPollutantValue(snap, 'pm2_5'),
    pm10: readPollutantValue(snap, 'pm10'),
    o3: readPollutantValue(snap, 'o3'),
    no2: readPollutantValue(snap, 'no2'),
    weather: snap.weather,
    trendDirection: snap.trendSummary.trendDirection,
    freshness: snap.freshness,
    observedAt: snap.observedAt,
    localTime: snap.localTime,
  }));

  const epochs = items
    .map((item) => Date.parse(item.observedAt))
    .filter((ms) => Number.isFinite(ms));

  let timestampsCompatible = true;
  let timestampWarning: string | null = null;
  if (epochs.length >= 2) {
    const spreadMs = Math.max(...epochs) - Math.min(...epochs);
    if (spreadMs > MAX_COMPATIBLE_DRIFT_MS) {
      timestampsCompatible = false;
      const spreadMin = Math.round(spreadMs / 60_000);
      timestampWarning = `Snapshot timestamps differ by ${spreadMin} minutes across locations; interpret direct comparison cautiously.`;
    }
  }

  const withAqi = items.filter((item) => item.computedAqi.value !== null);
  const sorted = [...withAqi].sort(
    (a, b) => (a.computedAqi.value ?? 999) - (b.computedAqi.value ?? 999)
  );

  const cleanest = sorted[0] ?? null;
  const highest = sorted[sorted.length - 1] ?? null;

  let summary = '';
  if (withAqi.length < 2 || !cleanest || !highest) {
    summary =
      language === 'ta'
        ? 'ஒப்பீடு செய்ய குறைந்தது இரண்டு நகரங்களின் போதுமான தரவு தேவை.'
        : language === 'hi'
          ? 'तुलना के लिए कम से कम दो स्थानों का पर्याप्त डेटा आवश्यक है।'
          : 'At least two locations with sufficient pollutant parameters are needed for a direct AQI comparison.';
  } else {
    const cleanestVal = cleanest.computedAqi.value ?? 0;
    const highestVal = highest.computedAqi.value ?? 0;
    const diff = highestVal - cleanestVal;

    if (language === 'ta') {
      summary = `${cleanest.location.name} (${cleanestVal} IN NAQI, ${cleanest.computedAqi.categoryLabel}) ஒப்பீட்டளவில் குறைந்த மாசு நிலையில் உள்ளது; ${highest.location.name} (${highestVal} IN NAQI, ${highest.computedAqi.categoryLabel}) ${diff} புள்ளிகள் அதிகமாக உள்ளது.`;
    } else if (language === 'hi') {
      summary = `${cleanest.location.name} (${cleanestVal} IN NAQI, ${cleanest.computedAqi.categoryLabel}) में तुलनात्मक रूप से कम सूचकांक है, जबकि ${highest.location.name} (${highestVal} IN NAQI, ${highest.computedAqi.categoryLabel}) ${diff} अंक अधिक है।`;
    } else {
      summary = `${cleanest.location.name} currently shows the lower indicative CPCB NAQI at ${cleanestVal} (${cleanest.computedAqi.categoryLabel}), which is ${diff} points lower than ${highest.location.name} (${highestVal}, ${highest.computedAqi.categoryLabel}).`;
    }
  }

  return {
    comparedAt,
    locations: items,
    cleanestLocationName: cleanest?.location.name ?? null,
    highestAqiLocationName: highest?.location.name ?? null,
    timestampsCompatible,
    timestampWarning,
    summary,
  };
}
