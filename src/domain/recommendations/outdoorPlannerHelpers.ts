import {
  ActivityType,
  BestWindowPlan,
  BestWindowRanking,
  CorePollutantId,
  HourlySlot,
  Language,
  ProfileCategory,
  TimeWindowPreference,
} from '@/types';
import { getCpcbCategoryByValue, POLLUTANT_SPECS } from '@/domain/aqi';
import { formatLocalHourLabel } from '@/lib/time/timezone';

export const ACTIVITY_LABELS: Record<ActivityType, Record<Language, string>> = {
  WALKING: { en: 'walking', ta: 'நடைபயிற்சி', hi: 'टहलने' },
  CYCLING: { en: 'cycling', ta: 'மிதிவண்டி பயணம்', hi: 'साइकिल चलाने' },
  RUNNING: { en: 'running', ta: 'ஓட்டம்', hi: 'दौड़ने' },
  OUTDOOR_SPORTS: { en: 'outdoor sports', ta: 'வெளிப்புற விளையாட்டு', hi: 'आउटडोर खेल' },
  SCHOOL_COMMUTE: { en: 'school commuting', ta: 'பள்ளிப் பயணம்', hi: 'स्कूल आवागमन' },
  OUTDOOR_RECREATION: { en: 'outdoor recreation', ta: 'வெளிப்புற பொழுதுபோக்கு', hi: 'बाहरी मनोरंजन' },
};

const PLANNER_DISCLAIMERS: Record<Language, string> = {
  ta: 'இந்தத் திட்டம் முன்னறிவிப்பு நிலைமைகளை மட்டுமே ஒப்பிடுகிறது; மருத்துவ தகுதியையோ எந்த நேரமும் முற்றிலும் மாசற்றது என்பதையோ உத்தரவாதம் செய்யாது.',
  hi: 'यह प्लानर केवल पर्यावरणीय पूर्वानुमान स्थितियों की तुलना करता है; यह किसी भी समय के पूरी तरह सुरक्षित होने की गारंटी या चिकित्सा सलाह नहीं देता।',
  en: 'This planner compares forecast environmental conditions only; it does not diagnose health risks, compute personal risk scores, or guarantee any period is completely pollution-free.',
};

export function getPlannerDisclaimer(lang: Language): string {
  return PLANNER_DISCLAIMERS[lang];
}

function matchesTimePreference(hourNum: number, pref: TimeWindowPreference): boolean {
  if (pref === 'ANY') return true;
  if (pref === 'MORNING') return hourNum >= 5 && hourNum < 11;
  if (pref === 'MIDDAY') return hourNum >= 11 && hourNum < 16;
  return hourNum >= 16 && hourNum <= 22;
}

/** Select the relevant forecast slice matching optional date and time-of-day preference. */
export function selectTargetSlots(
  hourlySlots: readonly HourlySlot[],
  targetDate?: string,
  timePreference: TimeWindowPreference = 'ANY'
): { resolvedDate: string; slotsToScore: HourlySlot[] } {
  const futureSlots = hourlySlots.filter((s) => s.isForecast || hourlySlots.indexOf(s) >= 0);
  const availableDates = Array.from(
    new Set(futureSlots.map((s) => formatLocalHourLabel(s.localTime).dateKey))
  );
  const resolvedDate =
    targetDate && availableDates.includes(targetDate)
      ? targetDate
      : (availableDates[0] ?? new Date().toISOString().slice(0, 10));

  const dateFiltered = futureSlots.filter(
    (s) => formatLocalHourLabel(s.localTime).dateKey === resolvedDate
  );
  const effectivePool = dateFiltered.length >= 4 ? dateFiltered : futureSlots.slice(0, 24);
  const prefFiltered = effectivePool.filter((s) =>
    matchesTimePreference(formatLocalHourLabel(s.localTime).hourNum, timePreference)
  );
  return {
    resolvedDate,
    slotsToScore: prefFiltered.length >= 2 ? prefFiltered : effectivePool.slice(0, 24),
  };
}

/** Aggregate and score a 2-hour block against AQI, endurance PM2.5, daytime ozone, rain, and heat. */
export function scoreWindowBlock(
  first: HourlySlot,
  second: HourlySlot,
  index: number,
  activity: ActivityType
): BestWindowRanking | null {
  const block = [first, second];
  const aqiVals = block
    .map((s) => s.computedAqi?.value)
    .filter((v): v is number => v !== null && v !== undefined);
  if (aqiVals.length === 0) return null;

  const avgAqi = Math.round(aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length);
  const pollutantAcc = new Map<CorePollutantId, { sum: number; count: number; unit: string }>();
  const temps: number[] = [];
  const winds: number[] = [];
  const precips: number[] = [];

  for (const s of block) {
    for (const m of s.measurements) {
      const cur = pollutantAcc.get(m.pollutant) ?? { sum: 0, count: 0, unit: m.unit };
      cur.sum += m.value;
      cur.count += 1;
      pollutantAcc.set(m.pollutant, cur);
    }
    if (s.weather) {
      temps.push(s.weather.temperature);
      winds.push(s.weather.windSpeed);
      precips.push(s.weather.precipitation);
    }
  }

  const readingsUsed = Array.from(pollutantAcc.entries()).map(([pollutant, acc]) => ({
    pollutant,
    avgValue: Number((acc.sum / acc.count).toFixed(1)),
    unit: acc.unit,
  }));

  const pm25Avg = readingsUsed.find((r) => r.pollutant === 'pm2_5')?.avgValue ?? 0;
  const o3Avg = readingsUsed.find((r) => r.pollutant === 'o3')?.avgValue ?? 0;
  const meanOf = (vals: number[]): number | undefined =>
    vals.length > 0
      ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
      : undefined;

  const tempAvg = meanOf(temps);
  const windAvg = meanOf(winds);
  const precipMax = precips.length > 0 ? Math.max(...precips) : undefined;
  const startLabel = formatLocalHourLabel(first.localTime);
  const endLabel = formatLocalHourLabel(second.localTime);
  const timeLabel = `${startLabel.hourLabel} – ${endLabel.hourLabel}`;

  let score = avgAqi;
  const adjustments: string[] = [];
  const isEndurance =
    activity === 'CYCLING' || activity === 'RUNNING' || activity === 'OUTDOOR_SPORTS';

  if (isEndurance && pm25Avg > 60) {
    score += 8;
    adjustments.push('+8 endurance PM₂.₅ burden (>60 µg/m³)');
  }
  if (
    (isEndurance || activity === 'OUTDOOR_RECREATION') &&
    o3Avg > 100 &&
    startLabel.hourNum >= 11 &&
    startLabel.hourNum <= 16
  ) {
    score += 10;
    adjustments.push('+10 daytime O₃ (>100 µg/m³)');
  }
  if (activity === 'SCHOOL_COMMUTE' && (startLabel.hourNum < 6 || startLabel.hourNum > 19)) {
    score += 6;
    adjustments.push('+6 outside typical school commute hours');
  }
  if (precipMax !== undefined && precipMax >= 1.0) {
    score += 14;
    adjustments.push(`+14 precipitation (${precipMax.toFixed(1)} mm)`);
  }
  if (tempAvg !== undefined && tempAvg >= 36) {
    score += 6;
    adjustments.push(`+6 high heat (${tempAvg}°C)`);
  }

  const catSpec = getCpcbCategoryByValue(avgAqi);
  const dominantPollutant = first.computedAqi?.dominantPollutant ?? 'pm2_5';
  const domFormula = POLLUTANT_SPECS[dominantPollutant].formula;

  return {
    id: `win-${index}-${first.localTime}`,
    startTime: first.time,
    endTime: second.time,
    startLocalTime: first.localTime,
    endLocalTime: second.localTime,
    timeLabel,
    averageAqi: avgAqi,
    minAqi: Math.min(...aqiVals),
    maxAqi: Math.max(...aqiVals),
    score,
    dominantPollutant,
    aqiCategory: catSpec?.name ?? 'Unknown',
    categoryColor: catSpec?.color ?? '#52525b',
    rank: 0,
    isBestWindow: false,
    comparisonReason: '',
    temperatureAvg: tempAvg,
    precipitationMax: precipMax,
    windSpeedAvg: windAvg,
    readingsUsed,
    whyThisTime: {
      aqiScale: 'Indicative India CPCB NAQI (0–500)',
      dataSource: 'Open-Meteo CAMS Atmospheric Forecast & Weather',
      forecastTimestamp: first.time,
      dominantFactor: `${domFormula} (window mean ${readingsUsed.find((r) => r.pollutant === dominantPollutant)?.avgValue ?? '--'})`,
      weatherContext:
        tempAvg !== undefined
          ? `Temp ${tempAvg}°C, Wind ${windAvg ?? '--'} km/h, Max rain ${precipMax ?? 0} mm`
          : 'Weather context unavailable',
      scoringNote:
        adjustments.length > 0
          ? `Base IN NAQI ${avgAqi}; activity context adjustments: ${adjustments.join(', ')}.`
          : `Base IN NAQI ${avgAqi} with no additional weather/ozone penalty.`,
      comparisonDetail: '',
      limitations: [
        'CAMS regional model resolution (~45 km global / ~11 km Europe) does not resolve street-level traffic corridors.',
        'Forecast conditions may shift as wind and boundary-layer mixing evolve.',
        'Does not evaluate individual medical suitability.',
      ],
    },
  };
}

/** Generate localized, profile-aware outdoor activity explanation for top vs peak window. */
export function buildActivityGuidance(
  category: ProfileCategory,
  actWord: string,
  best: BestWindowRanking,
  worst: BestWindowRanking,
  diffPct: number,
  language: Language
): BestWindowPlan['ageAdaptedExplanation'] {
  const bestAqi = best.averageAqi ?? 0;
  const worstAqi = worst.averageAqi ?? 0;

  if (language === 'ta') {
    return {
      headline: `ஒப்பீட்டளவில் சாதகமான நேரம் (${category}): ${best.timeLabel}`,
      recommendation: `${actWord} செயல்பாட்டிற்கு ${best.timeLabel} (முன்னறிவிப்பு NAQI ${bestAqi}, ${best.aqiCategory}) உச்ச நேரத்தை விட ${diffPct}% குறைந்த மாசு சுமையைக் காட்டுகிறது.`,
      activitySpecificAdvice:
        category === 'CHILD'
          ? 'பெரியவர்களிடம் கூறிவிட்டு விளையாடவும்; போதிய தண்ணீர் குடிக்கவும்.'
          : category === 'SENIOR'
            ? 'அமைதியான வேகத்தில் பூங்கா பாதைகளைத் தேர்ந்தெடுக்கவும்.'
            : 'போக்குவரத்து நெரிசல் குறைந்த பசுமைப் பாதைகளைத் தேர்வு செய்யவும்.',
      cautionNote: `${worst.timeLabel} இல் முன்னறிவிப்பு NAQI ${worstAqi} ஆக உயரலாம்.`,
    };
  }
  if (language === 'hi') {
    return {
      headline: `तुलनात्मक रूप से अनुकूल समय (${category}): ${best.timeLabel}`,
      recommendation: `${actWord} के लिए ${best.timeLabel} विंडो (अनुमानित NAQI ${bestAqi}, ${best.aqiCategory}) पीक समय की तुलना में ${diffPct}% कम प्रदूषण दर्शाती है।`,
      activitySpecificAdvice:
        category === 'CHILD'
          ? 'खेलते समय पानी पिएं और बड़ों की निगरानी में रहें।'
          : category === 'SENIOR'
            ? 'शांत गति से टहलें और मुख्य सड़कों की धूल से बचें।'
            : 'मुख्य यातायात सड़कों के बजाय पार्कों या खुले मार्गों को प्राथमिकता दें।',
      cautionNote: `${worst.timeLabel} के आसपास सूचकांक ${worstAqi} तक बढ़ सकता है।`,
    };
  }
  return {
    headline: `Comparatively Most Favorable Window (${category}): ${best.timeLabel}`,
    recommendation: `For ${actWord}, ${best.timeLabel} ranks lowest on combined pollution and weather score (forecast IN NAQI ${bestAqi}, ${best.aqiCategory} — ${diffPct}% lower than peak ${worst.timeLabel}).`,
    activitySpecificAdvice:
      category === 'CHILD'
        ? 'Plan active breaks and hydration; check with a parent or guardian before extended play.'
        : category === 'SENIOR'
          ? 'Prefer a comfortable pace along shaded, low-traffic paths.'
          : 'Prefer park paths or lower-traffic routes to reduce near-road exhaust exposure.',
    cautionNote: `Highest forecast burden falls around ${worst.timeLabel} (IN NAQI ${worstAqi}, ${worst.aqiCategory}).`,
  };
}
