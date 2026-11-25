/**
 * @module assistantService
 * Grounded AI assistant orchestration layer for the AirAware chat endpoint.
 *
 * Pipeline:
 * 1. `inspectUserPrompt` — strips control characters, blocks injection patterns
 * 2. `buildGroundedContext` — constructs a JSON snapshot of verified CAMS/NAQI data
 * 3. `callGeminiStructured` — calls Gemini with the grounded system prompt
 * 4. `StructuredAiOutputSchema.safeParse` — validates Gemini's JSON output with Zod
 * 5. `validateAiProseSafety` — checks that all cited numbers exist in the verified context
 * 6. `buildDeterministicChatResponse` — deterministic fallback for any failure path
 *
 * Invariants enforced by this module:
 * - Gemini never receives unvalidated user text
 * - Gemini output is never passed to the UI without Zod schema validation
 * - A deterministic response is always available as a fallback
 * - No personal data or API keys are logged
 */
import { inspectUserPrompt } from '@/lib/security/promptGuard';
import { logger } from '@/lib/logging/logger';
import { AirSnapshot, ChatMessage, Language, ProfileCategory, StructuredAiResponse } from '@/types';
import { buildDeterministicChatResponse } from './fallbackBuilder';
import { callGeminiStructured, parseJsonFromModel } from './geminiClient';
import { StructuredAiOutputSchema, validateAiProseSafety } from './responseSchema';

export { buildDeterministicChatResponse };

const LANGUAGE_NAMES: Record<Language, string> = {
  ta: 'Tamil',
  hi: 'Hindi',
  en: 'English',
};

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

function buildGroundedContext(
  primarySnapshot: AirSnapshot,
  comparisonSnapshots: readonly AirSnapshot[]
) {
  return {
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
}

function buildAssistantMessage(
  structured: StructuredAiResponse,
  category: ProfileCategory,
  language: Language,
  contentOverride?: string
): ChatMessage {
  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: contentOverride ?? structured.answer,
    structured,
    timestamp: new Date().toISOString(),
    profileCategory: category,
    language,
  };
}

/** Run server-grounded environmental assistant with Gemini verification and deterministic fallback. */
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

  const guard = inspectUserPrompt(question);
  if (!guard.safe) {
    const fallback = buildDeterministicChatResponse({
      question: 'current conditions summary',
      primarySnapshot,
      comparisonSnapshots,
      category,
      language,
    });
    return buildAssistantMessage(
      fallback,
      category,
      language,
      `${fallback.answer} (Note: Question was sanitized to maintain environmental grounding.)`
    );
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
  const systemInstruction = `You are AIRWARE AI INTELLIGENCE ASSISTANT, a scientific environmental communication assistant.
Target profile: ${category}. Response language: ${LANGUAGE_NAMES[language]}.
STRICT GROUNDING RULES:
1. Only cite numerical measurements and AQI values present in VERIFIED_CONTEXT JSON. Never invent numbers.
2. Distinguish verified CAMS regional model estimates (~45 km grid), calculated CPCB NAQI values, forecasts, and general environmental science. Never claim model data is a ground-station sensor or indoor reading.
3. Never issue medical diagnoses, prescriptions, or claim any time/place is "completely safe", "guaranteed safe", or "pollution-free".
4. Return ONLY valid JSON matching keys: answer, summary, relevantPollutants ([{pollutant,value,interpretation}]), supportingData ([string]), practicalGuidance ([string]), uncertainty (string), sources ([string]), followUpQuestions ([string]).`;

  const verifiedContext = buildGroundedContext(primarySnapshot, comparisonSnapshots);
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
  if (!rawText) return buildAssistantMessage(deterministicFallback, category, language);

  try {
    const schemaCheck = StructuredAiOutputSchema.safeParse(parseJsonFromModel(rawText));
    if (!schemaCheck.success) {
      logger.warn('AiAssistant', 'Gemini JSON failed schema validation; using fallback');
      return buildAssistantMessage(deterministicFallback, category, language);
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
      return buildAssistantMessage(deterministicFallback, category, language);
    }

    const structured: StructuredAiResponse = {
      ...schemaCheck.data,
      sources:
        schemaCheck.data.sources.length > 0
          ? schemaCheck.data.sources
          : deterministicFallback.sources,
      engineMode: 'GEMINI_GROUNDED',
    };
    return buildAssistantMessage(structured, category, language);
  } catch {
    return buildAssistantMessage(deterministicFallback, category, language);
  }
}
