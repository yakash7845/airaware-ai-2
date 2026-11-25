/**
 * @module enrichmentService
 * Thin AI enrichment layer that wraps deterministic domain outputs with Gemini-generated prose.
 *
 * Each exported function:
 * 1. Calls the deterministic fallback first so a valid response is always available.
 * 2. Sends only verified, grounded numbers to Gemini (never raw user input).
 * 3. Validates the JSON response with a narrow Zod schema.
 * 4. Runs `validateAiProseSafety` to reject any ungrounded numeric hallucinations.
 * 5. Returns the deterministic fallback on any validation failure.
 *
 * Invariant: AI output is never surfaced without both schema and numeric grounding checks.
 */
import { z } from 'zod';
import { buildProfileGuidance } from '@/domain/personalization/guidanceEngine';
import {
  AirSnapshot,
  BestWindowPlan,
  IndoorAdvisorPlan,
  Language,
  ProfileCategory,
  ProfileGuidance,
} from '@/types';
import { logger } from '@/lib/logging/logger';
import { toLanguageDisplayName } from '@/utils/languageUtils';
import { callGeminiStructured, parseJsonFromModel } from './geminiClient';
import { validateAiProseSafety } from './responseSchema';

/**
 * Generic Gemini enrichment helper: call Gemini, parse JSON, validate schema, check grounding.
 *
 * @param params.scope - Log scope label used in warning messages.
 * @param params.systemInstruction - Gemini system instruction text.
 * @param params.userPrompt - Gemini user prompt (must contain only grounded data).
 * @param params.schema - Zod object schema validating the parsed JSON response.
 * @param params.allowedNumbers - Numbers that may legitimately appear in AI prose output.
 * @param params.maxOutputTokens - Optional token cap; defaults to 550.
 * @returns The validated and grounded AI output, or `null` on any failure.
 */
async function enrichWithGeminiJson<T extends z.ZodType<Record<string, unknown>>>(params: {
  scope: string;
  systemInstruction: string;
  userPrompt: string;
  schema: T;
  allowedNumbers: number[];
  maxOutputTokens?: number;
}): Promise<z.infer<T> | null> {
  const raw = await callGeminiStructured({
    systemInstruction: params.systemInstruction,
    userPrompt: params.userPrompt,
    responseMimeType: 'application/json',
    maxOutputTokens: params.maxOutputTokens ?? 550,
  });
  if (!raw) return null;

  try {
    const parsedJson = parseJsonFromModel(raw);
    const checked = params.schema.safeParse(parsedJson);
    if (!checked.success) return null;

    const textJoined = Object.values(checked.data)
      .map((v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
      .join(' ');
    const safety = validateAiProseSafety(textJoined, params.allowedNumbers);
    if (!safety.valid) {
      logger.warn(params.scope, safety.reason);
      return null;
    }
    return checked.data;
  } catch (err: unknown) {
    logger.warn(
      params.scope,
      err instanceof Error
        ? `Gemini enrichment JSON error: ${err.message}`
        : 'Gemini enrichment failed'
    );
    return null;
  }
}

const ProfileEnrichSchema = z.object({
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  activityGuidance: z.string().min(1).max(400),
  pollutantBreakdown: z.string().min(1).max(300),
});

/**
 * Generate AI-enriched profile guidance narrative for a given environmental snapshot.
 *
 * Returns the deterministic fallback from {@link buildProfileGuidance} immediately if
 * Gemini is unavailable, the response fails schema validation, or any numeric grounding
 * violation is detected.
 *
 * @param snapshot - Verified environmental snapshot providing grounding numbers.
 * @param category - User profile category (e.g., `'CHILD'`, `'SENIOR'`).
 * @param language - Target response language (`'en'`, `'hi'`, `'ta'`).
 * @returns A {@link ProfileGuidance} with AI-enriched prose when grounding passes, or
 *          the deterministic baseline otherwise.
 */
export async function generateProfileGuidanceWithAi(
  snapshot: AirSnapshot,
  category: ProfileCategory,
  language: Language
): Promise<ProfileGuidance> {
  const fallback = buildProfileGuidance(snapshot, category, language);
  const allowedNumbers = [
    ...(snapshot.computedAqi.value !== null ? [snapshot.computedAqi.value] : []),
    ...snapshot.current.map((m) => m.value),
    ...(snapshot.weather ? [snapshot.weather.temperature, snapshot.weather.windSpeed] : []),
  ];

  const langName = toLanguageDisplayName(language);
  const enriched = await enrichWithGeminiJson({
    scope: 'ProfileGuidanceAi',
    systemInstruction: `Explain verified CPCB NAQI model estimates for profile ${category} in ${langName}. Use ONLY provided numbers. No medical diagnosis or "completely safe" claims. Return JSON: {headline, summary, activityGuidance, pollutantBreakdown}.`,
    userPrompt: JSON.stringify({
      location: snapshot.location.name,
      cpcbNaqi: snapshot.computedAqi.value,
      category: snapshot.computedAqi.categoryLabel,
      dominantPollutant: snapshot.computedAqi.dominantPollutant,
      pollutants: snapshot.current.map((m) => ({ id: m.pollutant, value: m.value, unit: m.unit })),
    }),
    schema: ProfileEnrichSchema,
    allowedNumbers,
  });

  if (!enriched) return fallback;
  return {
    ...fallback,
    headline: enriched.headline,
    summary: enriched.summary,
    activityGuidance: enriched.activityGuidance,
    pollutantBreakdown: enriched.pollutantBreakdown,
  };
}

const WindowEnrichSchema = z.object({
  headline: z.string().min(1).max(160),
  recommendation: z.string().min(1).max(500),
  activitySpecificAdvice: z.string().min(1).max(400),
  cautionNote: z.string().min(1).max(300),
});

/**
 * Enrich a {@link BestWindowPlan} with an AI-generated localized activity explanation.
 *
 * Returns the original plan unchanged if data is insufficient or if Gemini's response
 * fails grounding validation.
 *
 * @param plan - The deterministically computed best-window plan to enrich.
 * @returns The plan with `ageAdaptedExplanation` and `aiEnriched: true` when enrichment
 *          succeeds; the original plan otherwise.
 */
export async function enrichBestWindowWithAi(plan: BestWindowPlan): Promise<BestWindowPlan> {
  if (!plan.dataSufficient || !plan.bestWindow || !plan.worstWindow) return plan;

  const allowedNumbers = [
    plan.bestWindow.averageAqi ?? 0,
    plan.worstWindow.averageAqi ?? 0,
    ...plan.bestWindow.readingsUsed.map((r) => r.avgValue),
    ...plan.worstWindow.readingsUsed.map((r) => r.avgValue),
  ];
  const langName = toLanguageDisplayName(plan.language);
  const enriched = await enrichWithGeminiJson({
    scope: 'PlannerAi',
    systemInstruction: `Explain a deterministically ranked forecast window for ${plan.activity} and profile ${plan.profileCategory} in ${langName}. Never alter numbers or claim any period is safe. Return JSON: {headline, recommendation, activitySpecificAdvice, cautionNote}.`,
    userPrompt: JSON.stringify({
      location: plan.location,
      bestWindow: {
        time: plan.bestWindow.timeLabel,
        aqi: plan.bestWindow.averageAqi,
        category: plan.bestWindow.aqiCategory,
        dominant: plan.bestWindow.dominantPollutant,
      },
      worstWindow: {
        time: plan.worstWindow.timeLabel,
        aqi: plan.worstWindow.averageAqi,
        category: plan.worstWindow.aqiCategory,
      },
    }),
    schema: WindowEnrichSchema,
    allowedNumbers,
  });

  if (!enriched) return plan;
  return {
    ...plan,
    ageAdaptedExplanation: enriched,
    aiEnriched: true,
  };
}

const IndoorEnrichSchema = z.object({
  headline: z.string().min(1).max(160),
  overview: z.string().min(1).max(500),
  keyAction: z.string().min(1).max(300),
});

/**
 * Enrich an {@link IndoorAdvisorPlan} with AI-generated indoor hygiene guidance.
 *
 * The AI instruction explicitly prohibits inventing indoor sensor readings or AQI values;
 * only the outdoor AQI from the verified snapshot is an allowed numeric reference.
 * Returns the original plan when `outdoorAqi` is null or grounding fails.
 *
 * @param plan - The deterministically built indoor advisor plan.
 * @returns The plan with `familySummary` and `aiEnriched: true` when enrichment succeeds;
 *          the original plan otherwise.
 */
export async function enrichIndoorAdvisorWithAi(
  plan: IndoorAdvisorPlan
): Promise<IndoorAdvisorPlan> {
  if (plan.outdoorAqi === null) return plan;

  const langName = toLanguageDisplayName(plan.language);
  const enriched = await enrichWithGeminiJson({
    scope: 'IndoorAi',
    systemInstruction: `Summarize indoor environmental hygiene for ${plan.profileCategory} in ${langName}. NEVER invent indoor AQI or sensor numbers. Clearly state suggestions rely on outdoor model data and user space inputs. Return JSON: {headline, overview, keyAction}.`,
    userPrompt: JSON.stringify({
      location: plan.location,
      outdoorAqi: plan.outdoorAqi,
      outdoorCategory: plan.outdoorCategory,
      setup: plan.setup,
    }),
    schema: IndoorEnrichSchema,
    allowedNumbers: [plan.outdoorAqi],
  });

  if (!enriched) return plan;
  return {
    ...plan,
    familySummary: enriched,
    aiEnriched: true,
  };
}
