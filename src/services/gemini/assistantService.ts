import { POLLUTANT_SPECS } from '@/domain/aqi';
import { POLLUTANT_EDUCATION } from '@/domain/pollutants/educationalInfo';
import { buildPollutionIntelligence } from '@/domain/analytics/pollutionIntelligence';
import { buildProfileGuidance } from '@/domain/personalization/guidanceEngine';
import { inspectUserPrompt } from '@/lib/security/promptGuard';
import { logger } from '@/lib/logging/logger';
import { AirSnapshot, ChatMessage, Language, ProfileCategory, StructuredAiResponse } from '@/types';
import { callGeminiStructured, parseJsonFromModel } from './geminiClient';
import { StructuredAiOutputSchema, validateAiProseSafety } from './responseSchema';

function resolveLanguageName(language: Language): string {
  if (language === 'ta') return 'Tamil';
  if (language === 'hi') return 'Hindi';
  return 'English';
}

function collectAllowedNumbersFromSnapshots(snapshots: readonly AirSnapshot[]): number[] {
  const nums: number[] = [];
  for (const snap of snapshots) {
    if (snap.computedAqi.value !== null) nums.push(snap.computedAqi.value);
    if (snap.hourlyIndicativeAqi.value !== null) nums.push(snap.hourlyIndicativeAqi.value);
    for (const m of snap.current) {
      nums.push(m.value);
      if (m.rollingAverageValue !== null && m.rollingAverageValue !== undefined) {
        nums.push(m.rollingAverageValue);
      }
      const sub = snap.computedAqi.subIndices[m.pollutant];
      if (sub !== undefined) nums.push(sub);
    }
    if (snap.weather) {
      nums.push(
        snap.weather.temperature,
        snap.weather.humidity,
        snap.weather.windSpeed,
        snap.weather.windDirection,
        snap.weather.precipitation
      );
    }
    if (snap.trendSummary.pastMeanAqi !== null) nums.push(snap.trendSummary.pastMeanAqi);
    if (snap.trendSummary.forecastMeanAqi !== null) nums.push(snap.trendSummary.forecastMeanAqi);
    if (snap.trendSummary.aqiDeltaPercent !== null) {
      nums.push(Math.abs(snap.trendSummary.aqiDeltaPercent));
    }
  }
  return nums;
}

export function buildDeterministicChatResponse(params: {
  question: string;
  primarySnapshot: AirSnapshot;
  comparisonSnapshots?: readonly AirSnapshot[];
  category: ProfileCategory;
  language: Language;
}): StructuredAiResponse {
  const { question, primarySnapshot, comparisonSnapshots = [], category, language } = params;
  const qLower = question.toLowerCase();
  const aqiVal = primarySnapshot.computedAqi.value;
  const aqiCat = primarySnapshot.computedAqi.categoryLabel ?? 'Unavailable';
  const dom = primarySnapshot.computedAqi.dominantPollutant;
  const domSpec = dom ? POLLUTANT_SPECS[dom] : null;
  const city = primarySnapshot.location.name;

  const intel = buildPollutionIntelligence(primarySnapshot, language);
  const profileGuide = buildProfileGuidance(primarySnapshot, category, language);

  const relevantPollutants = primarySnapshot.current.slice(0, 4).map((m) => ({
    pollutant: POLLUTANT_SPECS[m.pollutant].formula,
    value: `${m.value} ${m.unit}`,
    interpretation: `Sub-index ${primarySnapshot.computedAqi.subIndices[m.pollutant] ?? '--'} (${POLLUTANT_SPECS[m.pollutant].averagingPeriod} CPCB standard: ${POLLUTANT_SPECS[m.pollutant].naaqs24hOr8hLimit} ${POLLUTANT_SPECS[m.pollutant].standardUnit})`,
  }));

  const supportingData: string[] = [
    `Location: ${city} (${primarySnapshot.location.latitude.toFixed(2)}, ${primarySnapshot.location.longitude.toFixed(2)})`,
    `Indicative IN NAQI: ${aqiVal ?? 'Unavailable'} (${aqiCat})`,
    ...(domSpec ? [`Dominant pollutant: ${domSpec.formula}`] : []),
    ...(primarySnapshot.weather
      ? [
          `Weather: ${primarySnapshot.weather.temperature}°C, Humidity ${primarySnapshot.weather.humidity}%, Wind ${primarySnapshot.weather.windSpeed} km/h`,
        ]
      : []),
    `Freshness: ${primarySnapshot.freshness} (${primarySnapshot.dataAge})`,
  ];

  const sources = primarySnapshot.sources.map((s) => `${s.name} (${s.attribution})`);

  // Topic-aware deterministic responses in EN, TA, HI
  let answer = '';
  let summary = '';

  if (language === 'ta') {
    if (qLower.includes('pm2.5') || qLower.includes('pm25')) {
      const pm25 = primarySnapshot.current.find((m) => m.pollutant === 'pm2_5');
      answer = `${POLLUTANT_EDUCATION.pm2_5.plainSummary.ta} ${city} பகுதியில் தற்போதைய PM₂.₅ ${pm25?.value ?? '--'} µg/m³ ஆகும்.`;
    } else if (
      qLower.includes('observed') ||
      qLower.includes('model') ||
      qLower.includes('மாதிரி')
    ) {
      answer = `தற்போதைய தரவு Copernicus CAMS வளிமண்டல மாதிரியிலிருந்து (~45 km கட்டம்) பெறப்பட்ட மதிப்பீடு; இது நேரடி சாலை சென்சார் அளவீடு அல்ல.`;
    } else if (comparisonSnapshots.length > 0) {
      const other = comparisonSnapshots[0]!;
      answer = `${city} (IN NAQI ${aqiVal ?? '--'}, ${aqiCat}) மற்றும் ${other.location.name} (IN NAQI ${other.computedAqi.value ?? '--'}, ${other.computedAqi.categoryLabel ?? '--'}) ஆகிய இரண்டும் CAMS மாதிரி அடிப்படையில் ஒப்பிடப்பட்டுள்ளன.`;
    } else {
      answer = `${city} பகுதியில் இன்றைய மதிப்பிடப்பட்ட இந்திய CPCB NAQI ${aqiVal ?? '--'} (${aqiCat}) ஆகும். ${profileGuide.activityGuidance}`;
    }
    summary = intel.headline;
  } else if (language === 'hi') {
    if (qLower.includes('pm2.5') || qLower.includes('pm25')) {
      const pm25 = primarySnapshot.current.find((m) => m.pollutant === 'pm2_5');
      answer = `${POLLUTANT_EDUCATION.pm2_5.plainSummary.hi} ${city} में वर्तमान PM₂.₅ ${pm25?.value ?? '--'} µg/m³ है।`;
    } else if (qLower.includes('observed') || qLower.includes('model') || qLower.includes('मॉडल')) {
      answer = `वर्तमान आंकड़े Copernicus CAMS वायुमंडलीय मॉडल (~45 किमी ग्रिड) का अनुमान हैं, किसी भौतिक स्ट्रीट सेंसर की सीधी रीडिंग नहीं।`;
    } else if (comparisonSnapshots.length > 0) {
      const other = comparisonSnapshots[0]!;
      answer = `${city} (IN NAQI ${aqiVal ?? '--'}, ${aqiCat}) की तुलना ${other.location.name} (IN NAQI ${other.computedAqi.value ?? '--'}, ${other.computedAqi.categoryLabel ?? '--'}) से की गई है।`;
    } else {
      answer = `${city} में आज का सांकेतिक भारतीय CPCB NAQI ${aqiVal ?? '--'} (${aqiCat}) है। ${profileGuide.activityGuidance}`;
    }
    summary = intel.headline;
  } else {
    if (qLower.includes('pm2.5') || qLower.includes('pm25')) {
      const pm25 = primarySnapshot.current.find((m) => m.pollutant === 'pm2_5');
      answer = `${POLLUTANT_EDUCATION.pm2_5.plainSummary.en} In ${city}, the current hourly CAMS estimate is ${pm25?.value ?? '--'} µg/m³ (24h CPCB standard: 60 µg/m³; WHO 24h guideline: 15 µg/m³).`;
    } else if (
      qLower.includes('observed') ||
      qLower.includes('modelled') ||
      qLower.includes('modeled')
    ) {
      answer = `Observed monitoring-station readings come from physical street-level analyzers, whereas the values shown here come from the Copernicus CAMS regional atmospheric model (~45 km global resolution) via Open-Meteo. AirAware AI clearly labels these as Model Estimates rather than physical station measurements.`;
    } else if (comparisonSnapshots.length > 0) {
      const other = comparisonSnapshots[0]!;
      answer = `${city} currently shows an indicative CPCB NAQI of ${aqiVal ?? '--'} (${aqiCat}), compared with ${other.location.name} at ${other.computedAqi.value ?? '--'} (${other.computedAqi.categoryLabel ?? 'Unavailable'}). Both are computed identically from CAMS model data.`;
    } else if (
      qLower.includes('forecast') ||
      qLower.includes('change') ||
      qLower.includes('tomorrow')
    ) {
      answer = `${intel.forecastOutlook} ${intel.anomaliesDetected[0] ?? ''}`.trim();
    } else if (
      qLower.includes('household') ||
      qLower.includes('family') ||
      qLower.includes('steps')
    ) {
      answer = `${profileGuide.summary} ${profileGuide.activityGuidance}`;
    } else {
      answer = `${intel.aqiInterpretation} ${intel.dominantPollutantExplanation} ${profileGuide.activityGuidance}`;
    }
    summary = intel.headline;
  }

  return {
    answer,
    summary,
    relevantPollutants,
    supportingData,
    practicalGuidance: [profileGuide.activityGuidance, ...profileGuide.precautionarySteps].slice(
      0,
      3
    ),
    uncertainty: primarySnapshot.spatialResolutionNote,
    sources,
    followUpQuestions:
      language === 'ta'
        ? ['முதன்மை மாசு ஏன் அதிகமாக உள்ளது?', 'முன்னறிவிப்பு எவ்வாறு மாறுகிறது?']
        : language === 'hi'
          ? ['प्रमुख प्रदूषक क्यों महत्वपूर्ण है?', 'आगामी पूर्वानुमान क्या दर्शाता है?']
          : [
              'What does the 24-hour forecast indicate?',
              'How does modelled CAMS data differ from ground sensors?',
              'What practical steps apply for my household today?',
            ],
    engineMode: 'DETERMINISTIC_FALLBACK',
  };
}

export async function runGroundedAiAssistant(params: {
  question: string;
  primarySnapshot: AirSnapshot;
  comparisonSnapshots?: readonly AirSnapshot[];
  category: ProfileCategory;
  language: Language;
  history?: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<ChatMessage> {
  const {
    question,
    primarySnapshot,
    comparisonSnapshots = [],
    category,
    language,
    history = [],
  } = params;
  const timestamp = new Date().toISOString();

  const guard = inspectUserPrompt(question);
  if (!guard.safe) {
    const fallback = buildDeterministicChatResponse({
      question: 'current conditions summary',
      primarySnapshot,
      comparisonSnapshots,
      category,
      language,
    });
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `${fallback.answer} (Note: Question was sanitized to maintain environmental grounding.)`,
      structured: fallback,
      timestamp,
      profileCategory: category,
      language,
    };
  }

  const deterministicFallback = buildDeterministicChatResponse({
    question: guard.sanitizedText,
    primarySnapshot,
    comparisonSnapshots,
    category,
    language,
  });

  const allowedNumbers = collectAllowedNumbersFromSnapshots([
    primarySnapshot,
    ...comparisonSnapshots,
  ]);
  const langName = resolveLanguageName(language);

  const systemInstruction = `You are AIRWARE AI INTELLIGENCE ASSISTANT, a scientific environmental communication assistant.
Target profile: ${category}. Response language: ${langName}.
STRICT GROUNDING RULES:
1. Only cite numerical measurements and AQI values present in VERIFIED_CONTEXT JSON. Never invent numbers.
2. Distinguish verified CAMS regional model estimates (~45 km grid), calculated CPCB NAQI values, forecasts, and general environmental science. Never claim model data is a ground-station sensor or indoor reading.
3. Never issue medical diagnoses, prescriptions, or claim any time/place is "completely safe", "guaranteed safe", or "pollution-free".
4. Return ONLY valid JSON matching keys: answer, summary, relevantPollutants ([{pollutant,value,interpretation}]), supportingData ([string]), practicalGuidance ([string]), uncertainty (string), sources ([string]), followUpQuestions ([string]).`;

  const verifiedContext = {
    primaryLocation: {
      name: primarySnapshot.location.name,
      observedAt: primarySnapshot.observedAt,
      freshness: primarySnapshot.freshness,
      cpcbNaqi: primarySnapshot.computedAqi.value,
      cpcbCategory: primarySnapshot.computedAqi.categoryLabel,
      methodology: primarySnapshot.computedAqi.methodDescription,
      dominantPollutant: primarySnapshot.computedAqi.dominantPollutant,
      pollutants: primarySnapshot.current.map((m) => ({
        pollutant: m.pollutant,
        hourlyValue: m.value,
        rollingAverageValue: m.rollingAverageValue,
        unit: m.unit,
        subIndex: primarySnapshot.computedAqi.subIndices[m.pollutant],
      })),
      weather: primarySnapshot.weather,
      trend: {
        pastMeanAqi: primarySnapshot.trendSummary.pastMeanAqi,
        forecastMeanAqi: primarySnapshot.trendSummary.forecastMeanAqi,
        direction: primarySnapshot.trendSummary.trendDirection,
      },
      events: primarySnapshot.events.map((e) => e.summary),
    },
    comparisonLocations: comparisonSnapshots.map((s) => ({
      name: s.location.name,
      cpcbNaqi: s.computedAqi.value,
      category: s.computedAqi.categoryLabel,
      dominantPollutant: s.computedAqi.dominantPollutant,
      pm25: s.current.find((m) => m.pollutant === 'pm2_5')?.value ?? null,
    })),
  };

  const recentHistoryText =
    history.length > 0
      ? `\nRECENT_CONVERSATION:\n${history
          .slice(-4)
          .map((h) => `${h.role.toUpperCase()}: ${h.content.slice(0, 250)}`)
          .join('\n')}`
      : '';

  const rawText = await callGeminiStructured({
    systemInstruction,
    userPrompt: `VERIFIED_CONTEXT:\n${JSON.stringify(verifiedContext)}${recentHistoryText}\n\nUSER_QUESTION:\n${guard.sanitizedText}`,
    responseMimeType: 'application/json',
    maxOutputTokens: 850,
  });

  if (!rawText) {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: deterministicFallback.answer,
      structured: deterministicFallback,
      timestamp,
      profileCategory: category,
      language,
    };
  }

  try {
    const parsedJson = parseJsonFromModel(rawText);
    const schemaCheck = StructuredAiOutputSchema.safeParse(parsedJson);
    if (!schemaCheck.success) {
      logger.warn('AiAssistant', 'Gemini JSON failed schema validation; using fallback');
      return {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: deterministicFallback.answer,
        structured: deterministicFallback,
        timestamp,
        profileCategory: category,
        language,
      };
    }

    const proseToCheck = [
      schemaCheck.data.answer,
      schemaCheck.data.summary,
      ...schemaCheck.data.practicalGuidance,
      ...schemaCheck.data.supportingData,
    ].join(' ');

    const safetyCheck = validateAiProseSafety(proseToCheck, allowedNumbers);
    if (!safetyCheck.valid) {
      logger.warn('AiAssistant', `Gemini grounding rejected: ${safetyCheck.reason}`);
      return {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: deterministicFallback.answer,
        structured: deterministicFallback,
        timestamp,
        profileCategory: category,
        language,
      };
    }

    const structured: StructuredAiResponse = {
      ...schemaCheck.data,
      sources:
        schemaCheck.data.sources.length > 0
          ? schemaCheck.data.sources
          : deterministicFallback.sources,
      engineMode: 'GEMINI_GROUNDED',
    };

    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: structured.answer,
      structured,
      timestamp,
      profileCategory: category,
      language,
    };
  } catch {
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: deterministicFallback.answer,
      structured: deterministicFallback,
      timestamp,
      profileCategory: category,
      language,
    };
  }
}
