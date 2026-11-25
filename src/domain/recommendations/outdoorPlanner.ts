/**
 * @module outdoorPlanner
 * Deterministic outdoor activity window ranking engine for AirAware.
 *
 * Evaluates and ranks all available 2-hour forecast windows by their suitability
 * for a given physical activity, using:
 * - Forecast AQI values (from CPCB NAQI computation)
 * - Activity-specific ventilation sensitivity (MET-weight adjusted AQI thresholds)
 * - Meteorological comfort factors (temperature, wind speed)
 *
 * Rankings are purely deterministic — no AI, no randomness. Unavailable forecast
 * hours are excluded rather than fabricated (data sufficiency is flagged explicitly).
 */
import {
  ActivityType,
  BestWindowPlan,
  BestWindowRanking,
  HourlySlot,
  Language,
  ProfileCategory,
  TimeWindowPreference,
} from '@/types';
import {
  ACTIVITY_LABELS,
  buildActivityGuidance,
  getPlannerDisclaimer,
  scoreWindowBlock,
  selectTargetSlots,
} from './outdoorPlannerHelpers';

/**
 * Build a BestWindowPlan with no ranked windows for cases where the forecast horizon
 * is insufficient or all slots lack valid AQI computations.
 *
 * @param params - Required fields to construct the incomplete plan response.
 * @returns A BestWindowPlan with `dataSufficient: false` and empty `rankedWindows`.
 */
function buildIncompletePlan(params: {
  locationName: string;
  resolvedDate: string;
  timePreference: TimeWindowPreference;
  fetchedAt: string;
  activity: ActivityType;
  profileCategory: ProfileCategory;
  language: Language;
  filteredSlots: HourlySlot[];
  headline: string;
  recommendation: string;
}): BestWindowPlan {
  return {
    location: params.locationName,
    targetDate: params.resolvedDate,
    timePreference: params.timePreference,
    fetchedAt: params.fetchedAt,
    activity: params.activity,
    profileCategory: params.profileCategory,
    language: params.language,
    rankedWindows: [],
    bestWindow: null,
    worstWindow: null,
    filteredSlots: params.filteredSlots,
    ageAdaptedExplanation: {
      headline: params.headline,
      recommendation: params.recommendation,
      activitySpecificAdvice: 'Refer to current live air quality measurements.',
      cautionNote: 'Unavailable hours are excluded rather than fabricated.',
    },
    aiEnriched: false,
    disclaimer: getPlannerDisclaimer(params.language),
    dataSufficient: false,
  };
}

/**
 * Sort window rankings ascending by score, assign rank ordinals, and annotate each
 * window with a human-readable comparison reason string.
 *
 * @param rankings - Mutable array of scored BestWindowRanking objects.
 * @returns The best window, worst window, and percentage difference between them.
 */
function rankAndCompareWindows(rankings: BestWindowRanking[]): {
  bestWindow: BestWindowRanking;
  worstWindow: BestWindowRanking;
  diffPct: number;
} {
  rankings.sort((a, b) =>
    a.score !== b.score ? a.score - b.score : (a.maxAqi ?? 999) - (b.maxAqi ?? 999)
  );
  rankings.forEach((w, idx) => {
    w.rank = idx + 1;
    w.isBestWindow = idx === 0;
  });

  const bestWindow = rankings[0]!;
  const worstWindow = rankings[rankings.length - 1]!;
  const bestAqi = bestWindow.averageAqi ?? 0;
  const worstAqi = worstWindow.averageAqi ?? 0;
  const diffPoints = Math.max(0, worstAqi - bestAqi);
  const diffPct = worstAqi > 0 ? Math.round((diffPoints / worstAqi) * 100) : 0;

  for (const w of rankings) {
    const delta = (w.averageAqi ?? 0) - bestAqi;
    if (w.isBestWindow) {
      w.comparisonReason =
        diffPoints > 0
          ? `Forecast indicative IN NAQI ${bestAqi} (${bestWindow.aqiCategory}), ${diffPoints} pts (${diffPct}%) lower than peak window (${worstWindow.timeLabel}, IN NAQI ${worstAqi}).`
          : `Forecast indicative IN NAQI ${bestAqi} (${bestWindow.aqiCategory}), steady across evaluated windows.`;
      w.whyThisTime.comparisonDetail = w.comparisonReason;
    } else {
      w.comparisonReason = `+${delta} AQI pts above top-ranked window (${bestWindow.timeLabel}).`;
      w.whyThisTime.comparisonDetail = `Score ${w.score} vs ${bestWindow.score} for ${bestWindow.timeLabel}.`;
    }
  }

  return { bestWindow, worstWindow, diffPct };
}

/**
 * Evaluate and rank 2-hour outdoor activity windows deterministically using forecast AQI,
 * activity ventilation sensitivity (PM₂.₅ and afternoon O₃), and meteorological comfort.
 *
 * @param params.hourlySlots - Chronological forecast slots (must include computed AQI values).
 * @param params.activity - The physical activity type determining AQI sensitivity weights.
 * @param params.profileCategory - User age group for age-adapted explanation text.
 * @param params.language - Display language for all human-readable output strings.
 * @param params.locationName - Display name for the location (used in plan metadata).
 * @param params.targetDate - ISO date string for the target day; defaults to the nearest forecast day.
 * @param params.timePreference - Optional time-of-day filter (`'MORNING'`, `'AFTERNOON'`, `'ANY'`).
 * @returns A fully populated BestWindowPlan with ranked windows, best/worst picks, and guidance.
 */
export function evaluateOutdoorWindows(params: {
  hourlySlots: readonly HourlySlot[];
  activity: ActivityType;
  profileCategory: ProfileCategory;
  language: Language;
  locationName: string;
  targetDate?: string;
  timePreference?: TimeWindowPreference;
}): BestWindowPlan {
  const {
    hourlySlots,
    activity,
    profileCategory,
    language,
    locationName,
    timePreference = 'ANY',
  } = params;
  const fetchedAt = new Date().toISOString();
  const { resolvedDate, slotsToScore } = selectTargetSlots(
    hourlySlots,
    params.targetDate,
    timePreference
  );

  if (slotsToScore.length < 4) {
    return buildIncompletePlan({
      locationName,
      resolvedDate,
      timePreference,
      fetchedAt,
      activity,
      profileCategory,
      language,
      filteredSlots: slotsToScore,
      headline:
        language === 'ta'
          ? 'முன்னறிவிப்பு தரவு போதுமானதாக இல்லை'
          : language === 'hi'
            ? 'पर्याप्त पूर्वानुमान डेटा उपलब्ध नहीं'
            : 'Insufficient Forecast Horizon',
      recommendation:
        language === 'ta'
          ? 'குறைந்தது 4 மணிநேர முன்னறிவிப்பு தேவைப்படுகிறது.'
          : language === 'hi'
            ? 'तुलना के लिए कम से कम 4 घंटे का पूर्वानुमान आवश्यक है।'
            : 'At least 4 forecast hours are needed to compare windows reliably without inventing data.',
    });
  }

  const rankings: BestWindowRanking[] = [];
  for (let i = 0; i <= slotsToScore.length - 2; i += 2) {
    const scored = scoreWindowBlock(slotsToScore[i]!, slotsToScore[i + 1]!, i, activity);
    if (scored) rankings.push(scored);
  }

  if (rankings.length === 0) {
    return buildIncompletePlan({
      locationName,
      resolvedDate,
      timePreference,
      fetchedAt,
      activity,
      profileCategory,
      language,
      filteredSlots: slotsToScore,
      headline: 'Forecast Values Incomplete',
      recommendation: 'Available forecast hours lacked valid AQI computations.',
    });
  }

  const { bestWindow, worstWindow, diffPct } = rankAndCompareWindows(rankings);
  return {
    location: locationName,
    targetDate: resolvedDate,
    timePreference,
    fetchedAt,
    activity,
    profileCategory,
    language,
    rankedWindows: rankings,
    bestWindow,
    worstWindow,
    filteredSlots: slotsToScore,
    ageAdaptedExplanation: buildActivityGuidance(
      profileCategory,
      ACTIVITY_LABELS[activity][language],
      bestWindow,
      worstWindow,
      diffPct,
      language
    ),
    aiEnriched: false,
    disclaimer: getPlannerDisclaimer(language),
    dataSufficient: true,
  };
}
