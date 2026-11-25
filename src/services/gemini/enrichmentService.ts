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
import { callGeminiStructured, parseJsonFromModel } from './geminiClient';
import { validateAiProseSafety } from './responseSchema';

async function enrichWithGeminiJson<T extends z.ZodTypeAny>(params: {
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

    const textJoined = Object.values(checked.data as Record<string, unknown>)
      .map((v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
      .join(' ');
    const safety = validateAiProseSafety(textJoined, params.allowedNumbers);
    if (!safety.valid) {
      logger.warn(params.scope, safety.reason);
      return null;
    }
    return checked.data;
  } catch {
    return null;
  }
}

const ProfileEnrichSchema = z.object({
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(500),
  activityGuidance: z.string().min(1).max(400),
  pollutantBreakdown: z.string().min(1).max(300),
});

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

  const langName = language === 'ta' ? 'Tamil' : language === 'hi' ? 'Hindi' : 'English';
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

export async function enrichBestWindowWithAi(plan: BestWindowPlan): Promise<BestWindowPlan> {
  if (!plan.dataSufficient || !plan.bestWindow || !plan.worstWindow) return plan;

  const allowedNumbers = [
    plan.bestWindow.averageAqi ?? 0,
    plan.worstWindow.averageAqi ?? 0,
    ...plan.bestWindow.readingsUsed.map((r) => r.avgValue),
    ...plan.worstWindow.readingsUsed.map((r) => r.avgValue),
  ];
  const langName = plan.language === 'ta' ? 'Tamil' : plan.language === 'hi' ? 'Hindi' : 'English';

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

export async function enrichIndoorAdvisorWithAi(
  plan: IndoorAdvisorPlan
): Promise<IndoorAdvisorPlan> {
  if (plan.outdoorAqi === null) return plan;

  const langName = plan.language === 'ta' ? 'Tamil' : plan.language === 'hi' ? 'Hindi' : 'English';
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
