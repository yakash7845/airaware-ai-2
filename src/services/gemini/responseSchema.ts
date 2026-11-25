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

const POLICY_CONSTANTS = new Set([
  0, 1, 2, 2.5, 3, 6, 8, 10, 11, 15, 16, 24, 25, 30, 40, 45, 48, 50, 60, 72, 80, 100, 200, 300, 400,
  500, 2014, 2021,
]);

export function extractQuantitativeNumbers(text: string): number[] {
  const scrubbed = text
    .replace(/\b(?:PM\s*2\.5|PM\s*10|PM2_5|NO2|SO2|O3|CO2|NH3|CC\s*BY\s*4\.0)\b/gi, ' ')
    .replace(/\/m[3³]\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ') // Ignore clock times like 14:00
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, ' '); // Ignore ISO dates

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
