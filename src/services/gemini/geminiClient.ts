import { APP_CONFIG, getServerGeminiApiKey } from '@/lib/configuration/env';
import { logger } from '@/lib/logging/logger';

interface GeminiApiCandidateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export interface GeminiCallOptions {
  systemInstruction: string;
  userPrompt: string;
  responseMimeType?: 'application/json' | 'text/plain';
  maxOutputTokens?: number;
  temperature?: number;
}

export async function callGeminiStructured(options: GeminiCallOptions): Promise<string | null> {
  const apiKey = getServerGeminiApiKey();
  if (!apiKey) return null;

  const url = `${APP_CONFIG.gemini.endpointBase}/${APP_CONFIG.gemini.model}:generateContent`;

  for (let attempt = 0; attempt <= APP_CONFIG.gemini.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), APP_CONFIG.gemini.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: options.systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: options.userPrompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? APP_CONFIG.gemini.maxOutputTokens,
            ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          },
        }),
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        logger.warn('GeminiClient', `Upstream HTTP ${response.status}`, { attempt, retryable });
        if (!retryable || attempt === APP_CONFIG.gemini.maxRetries) {
          return null;
        }
        await new Promise((r) => setTimeout(r, 350));
        continue;
      }

      const payload = (await response.json()) as GeminiApiCandidateResponse;
      return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    } catch (err: unknown) {
      logger.warn(
        'GeminiClient',
        err instanceof Error ? err.message : 'Gemini request failed or timed out',
        { attempt }
      );
      if (attempt === APP_CONFIG.gemini.maxRetries) return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

export function parseJsonFromModel(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as unknown;
}
