/**
 * @module responseSchema
 * Zod structural contract and numeric/medical safety validator for Gemini AI outputs.
 *
 * Prevents LLM hallucinations from surfacing in the UI by:
 * 1. Requiring strict adherence to {@link StructuredAiOutputSchema}.
 * 2. Rejecting forbidden medical diagnosis or "completely safe / pollution-free" prose.
 * 3. Ensuring every quantitative number mentioned by the model matches verified context
 *    measurements (or known CPCB/WHO regulatory policy constants).
 */
import { z } from 'zod';

export const StructuredAiOutputSchema = z.object({
  answer: z.string().min(1).max(2000),
  summary: z.string().min(1).max(600),
  relevantPollutants: z
    .array(
      z.object({
        pollutant: z.string().min(1).max(40),
        value: z.string().min(1).max(60),
        interpretation: z.string().min(1).max(300),
      })
    )
    .max(8)
    .default([]),
  supportingData: z.array(z.string().max(240)).max(8).default([]),
  practicalGuidance: z.array(z.string().max(240)).max(6).default([]),
  uncertainty: z.string().min(1).max(500),
  sources: z.array(z.string().max(200)).max(6).default([]),
  followUpQuestions: z.array(z.string().max(160)).max(4).default([]),
});

export type RawStructuredAiOutput = z.infer<typeof StructuredAiOutputSchema>;

const FORBIDDEN_MEDICAL_PATTERNS: ReadonlyArray<RegExp> = [
  /\bdiagnos(is|ed|e|ing)\b/i,
  /\bprescrib(e|ed|ing|tion)\b/i,
  /\bcure(s|d)?\b/i,
  /\bmedical\s+advice\b/i,
  /\bclinical\s+assessment\b/i,
  /\bcompletely\s+safe\b/i,
  /\bguaranteed\s+safe\b/i,
  /\bpollution[- ]free\b/i,
  /\byou\s+have\s+(asthma|copd|bronchitis|heart\s+disease)\b/i,
];

/** CPCB NAQI scale boundaries, averaging intervals, and minimum pollutant counts. */
const CPCB_STANDARD_CONSTANTS = [0, 1, 2, 3, 6, 8, 16, 24, 30, 50, 60, 80, 100, 200, 300, 400, 500];
/** WHO 2021 guideline benchmarks, CAMS grid resolutions (km), and forecast horizons (h). */
const SCIENTIFIC_AND_MODEL_CONSTANTS = [2.5, 10, 11, 15, 25, 40, 45, 48, 72];
/** Regulatory publication years (CPCB 2014 NAQI, WHO 2021 AQG) exempt from grounding errors. */
const REGULATORY_PUBLICATION_YEARS = [2014, 2021];

const POLICY_CONSTANTS = new Set<number>([
  ...CPCB_STANDARD_CONSTANTS,
  ...SCIENTIFIC_AND_MODEL_CONSTANTS,
  ...REGULATORY_PUBLICATION_YEARS,
]);

/**
 * Extract quantitative numeric literals from AI-generated prose while ignoring
 * chemical formulas (`PM2.5`, `NO2`, `CC BY 4.0`), unit denominators (`/m3`),
 * clock timestamps (`14:00`), ISO calendar dates (`2026-11-25`), and fixed
 * regulatory constants ({@link POLICY_CONSTANTS}).
 *
 * @param text - Concatenated AI-generated text to inspect.
 * @returns Array of quantitative numeric tokens requiring verification against context.
 */
export function extractQuantitativeNumbers(text: string): number[] {
  const scrubbed = text
    .replace(/\b(?:PM\s*2\.5|PM\s*10|PM2_5|NO2|SO2|O3|CO2|NH3|CC\s*BY\s*4\.0)\b/gi, ' ')
    .replace(/\/m[3³]\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, ' ');

  const matches = scrubbed.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  const nums: number[] = [];
  for (const m of matches) {
    const val = Number.parseFloat(m);
    if (Number.isFinite(val) && !POLICY_CONSTANTS.has(val)) {
      nums.push(val);
    }
  }
  return nums;
}

/**
 * Validate AI-generated prose against medical/safety disclaimers and numeric grounding.
 * Every quantitative token found by {@link extractQuantitativeNumbers} must fall within
 * `±0.15` of a verified context number to prevent rounding-induced false rejections.
 *
 * @param text - AI response prose to verify.
 * @param allowedNumbers - Numeric measurements verified in the request context.
 * @returns `{ valid: true }` when safe and grounded, or `{ valid: false, reason }` otherwise.
 */
export function validateAiProseSafety(
  text: string,
  allowedNumbers: number[]
): { valid: true } | { valid: false; reason: string } {
  for (const pat of FORBIDDEN_MEDICAL_PATTERNS) {
    if (pat.test(text)) {
      return { valid: false, reason: `Forbidden medical or safety claim matched: ${pat.source}` };
    }
  }

  const allowedSet = new Set<number>();
  for (const n of allowedNumbers) {
    if (!Number.isFinite(n)) continue;
    allowedSet.add(n);
    allowedSet.add(Math.round(n));
    allowedSet.add(Number(n.toFixed(1)));
    allowedSet.add(Number(n.toFixed(2)));
  }

  const foundNumbers = extractQuantitativeNumbers(text);
  for (const num of foundNumbers) {
    const matched = Array.from(allowedSet).some((allowed) => Math.abs(allowed - num) <= 0.15);
    if (!matched) {
      return { valid: false, reason: `Ungrounded numeric token "${num}" detected in AI output.` };
    }
  }

  return { valid: true };
}
