/**
 * @module fallbackBuilder
 * Deterministic, multilingual environmental assistant fallback generator.
 * Guarantees grounded structured answers whenever Gemini is unconfigured,
 * times out, or fails safety/grounding verification.
 */
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { POLLUTANT_EDUCATION } from '@/domain/pollutants/educationalInfo';
import { buildPollutionIntelligence } from '@/domain/analytics/pollutionIntelligence';
import { buildProfileGuidance } from '@/domain/personalization/guidanceEngine';
import { AirSnapshot, Language, ProfileCategory, StructuredAiResponse } from '@/types';

const FOLLOW_UP_MAP: Record<Language, string[]> = {
  ta: ['முதன்மை மாசு ஏன் அதிகமாக உள்ளது?', 'முன்னறிவிப்பு எவ்வாறு மாறுகிறது?'],
  hi: ['प्रमुख प्रदूषक क्यों महत्वपूर्ण है?', 'आगामी पूर्वानुमान क्या दर्शाता है?'],
  en: [
    'What does the 24-hour forecast indicate?',
    'How does modelled CAMS data differ from ground sensors?',
    'What practical steps apply for my household today?',
  ],
};

function selectTopicAnswer(params: {
  qLower: string;
  language: Language;
  primarySnapshot: AirSnapshot;
  comparisonSnapshots: readonly AirSnapshot[];
  intel: ReturnType<typeof buildPollutionIntelligence>;
  profileGuide: ReturnType<typeof buildProfileGuidance>;
}): string {
  const { qLower, language, primarySnapshot, comparisonSnapshots, intel, profileGuide } = params;
  const city = primarySnapshot.location.name;
  const aqiVal = primarySnapshot.computedAqi.value;
  const aqiCat = primarySnapshot.computedAqi.categoryLabel ?? 'Unavailable';
  const pm25Val = primarySnapshot.current.find((m) => m.pollutant === 'pm2_5')?.value ?? '--';
  const isModelQuery =
    qLower.includes('observed') ||
    qLower.includes('modelled') ||
    qLower.includes('modeled') ||
    qLower.includes('model') ||
    qLower.includes('மாதிரி') ||
    qLower.includes('मॉडल');

  if (language === 'ta') {
    if (qLower.includes('pm2.5') || qLower.includes('pm25')) {
      return `${POLLUTANT_EDUCATION.pm2_5.plainSummary.ta} ${city} பகுதியில் தற்போதைய PM₂.₅ ${pm25Val} µg/m³ ஆகும்.`;
    }
    if (isModelQuery) {
      return 'தற்போதைய தரவு Copernicus CAMS வளிமண்டல மாதிரியிலிருந்து (~45 km கட்டம்) பெறப்பட்ட மதிப்பீடு; இது நேரடி சாலை சென்சார் அளவீடு அல்ல.';
    }
    if (comparisonSnapshots.length > 0) {
      const other = comparisonSnapshots[0]!;
      return `${city} (IN NAQI ${aqiVal ?? '--'}, ${aqiCat}) மற்றும் ${other.location.name} (IN NAQI ${other.computedAqi.value ?? '--'}, ${other.computedAqi.categoryLabel ?? '--'}) ஆகிய இரண்டும் CAMS மாதிரி அடிப்படையில் ஒப்பிடப்பட்டுள்ளன.`;
    }
    return `${city} பகுதியில் இன்றைய மதிப்பிடப்பட்ட இந்திய CPCB NAQI ${aqiVal ?? '--'} (${aqiCat}) ஆகும். ${profileGuide.activityGuidance}`;
  }

  if (language === 'hi') {
    if (qLower.includes('pm2.5') || qLower.includes('pm25')) {
      return `${POLLUTANT_EDUCATION.pm2_5.plainSummary.hi} ${city} में वर्तमान PM₂.₅ ${pm25Val} µg/m³ है।`;
    }
    if (isModelQuery) {
      return 'वर्तमान आंकड़े Copernicus CAMS वायुमंडलीय मॉडल (~45 किमी ग्रिड) का अनुमान हैं, किसी भौतिक स्ट्रीट सेंसर की सीधी रीडिंग नहीं।';
    }
    if (comparisonSnapshots.length > 0) {
      const other = comparisonSnapshots[0]!;
      return `${city} (IN NAQI ${aqiVal ?? '--'}, ${aqiCat}) की तुलना ${other.location.name} (IN NAQI ${other.computedAqi.value ?? '--'}, ${other.computedAqi.categoryLabel ?? '--'}) से की गई है।`;
    }
    return `${city} में आज का सांकेतिक भारतीय CPCB NAQI ${aqiVal ?? '--'} (${aqiCat}) है। ${profileGuide.activityGuidance}`;
  }

  if (qLower.includes('pm2.5') || qLower.includes('pm25')) {
    return `${POLLUTANT_EDUCATION.pm2_5.plainSummary.en} In ${city}, the current hourly CAMS estimate is ${pm25Val} µg/m³ (24h CPCB standard: 60 µg/m³; WHO 24h guideline: 15 µg/m³).`;
  }
  if (isModelQuery) {
    return 'Observed monitoring-station readings come from physical street-level analyzers, whereas the values shown here come from the Copernicus CAMS regional atmospheric model (~45 km global resolution) via Open-Meteo. AirAware AI clearly labels these as Model Estimates rather than physical station measurements.';
  }
  if (comparisonSnapshots.length > 0) {
    const other = comparisonSnapshots[0]!;
    return `${city} currently shows an indicative CPCB NAQI of ${aqiVal ?? '--'} (${aqiCat}), compared with ${other.location.name} at ${other.computedAqi.value ?? '--'} (${other.computedAqi.categoryLabel ?? 'Unavailable'}). Both are computed identically from CAMS model data.`;
  }
  if (qLower.includes('forecast') || qLower.includes('change') || qLower.includes('tomorrow')) {
    return `${intel.forecastOutlook} ${intel.anomaliesDetected[0] ?? ''}`.trim();
  }
  if (qLower.includes('household') || qLower.includes('family') || qLower.includes('steps')) {
    return `${profileGuide.summary} ${profileGuide.activityGuidance}`;
  }
  return `${intel.aqiInterpretation} ${intel.dominantPollutantExplanation} ${profileGuide.activityGuidance}`;
}

/** Build a deterministic, verified fallback assistant response when Gemini is unavailable or rejected. */
export function buildDeterministicChatResponse(params: {
  question: string;
  primarySnapshot: AirSnapshot;
  comparisonSnapshots?: readonly AirSnapshot[];
  category: ProfileCategory;
  language: Language;
}): StructuredAiResponse {
  const { question, primarySnapshot, comparisonSnapshots = [], category, language } = params;
  const dom = primarySnapshot.computedAqi.dominantPollutant;
  const domSpec = dom ? POLLUTANT_SPECS[dom] : null;
  const intel = buildPollutionIntelligence(primarySnapshot, language);
  const profileGuide = buildProfileGuidance(primarySnapshot, category, language);

  return {
    answer: selectTopicAnswer({
      qLower: question.toLowerCase(),
      language,
      primarySnapshot,
      comparisonSnapshots,
      intel,
      profileGuide,
    }),
    summary: intel.headline,
    relevantPollutants: primarySnapshot.current.slice(0, 4).map((m) => ({
      pollutant: POLLUTANT_SPECS[m.pollutant].formula,
      value: `${m.value} ${m.unit}`,
      interpretation: `Sub-index ${primarySnapshot.computedAqi.subIndices[m.pollutant] ?? '--'} (${POLLUTANT_SPECS[m.pollutant].averagingPeriod} CPCB standard: ${POLLUTANT_SPECS[m.pollutant].naaqs24hOr8hLimit} ${POLLUTANT_SPECS[m.pollutant].standardUnit})`,
    })),
    supportingData: [
      `Location: ${primarySnapshot.location.name} (${primarySnapshot.location.latitude.toFixed(2)}, ${primarySnapshot.location.longitude.toFixed(2)})`,
      `Indicative IN NAQI: ${primarySnapshot.computedAqi.value ?? 'Unavailable'} (${primarySnapshot.computedAqi.categoryLabel ?? 'Unavailable'})`,
      ...(domSpec ? [`Dominant pollutant: ${domSpec.formula}`] : []),
      ...(primarySnapshot.weather
        ? [
            `Weather: ${primarySnapshot.weather.temperature}°C, Humidity ${primarySnapshot.weather.humidity}%, Wind ${primarySnapshot.weather.windSpeed} km/h`,
          ]
        : []),
      `Freshness: ${primarySnapshot.freshness} (${primarySnapshot.dataAge})`,
    ],
    practicalGuidance: [profileGuide.activityGuidance, ...profileGuide.precautionarySteps].slice(
      0,
      3
    ),
    uncertainty: primarySnapshot.spatialResolutionNote,
    sources: primarySnapshot.sources.map((s) => `${s.name} (${s.attribution})`),
    followUpQuestions: FOLLOW_UP_MAP[language],
    engineMode: 'DETERMINISTIC_FALLBACK',
  };
}
