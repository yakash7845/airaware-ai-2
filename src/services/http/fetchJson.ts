import { z } from 'zod';
import { APP_CONFIG } from '@/lib/configuration/env';
import { ProviderError } from '@/lib/errors/appError';

const inFlightRequests = new Map<string, Promise<unknown>>();

export function assertValidCoordinates(
  latitude: number,
  longitude: number,
  provider: string
): { latRounded: number; lonRounded: number } {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < APP_CONFIG.coordinates.minLat ||
    latitude > APP_CONFIG.coordinates.maxLat ||
    longitude < APP_CONFIG.coordinates.minLon ||
    longitude > APP_CONFIG.coordinates.maxLon
  ) {
    throw new ProviderError({
      message: `Invalid coordinates: lat=${latitude}, lon=${longitude}`,
      code: 'INVALID_COORDINATES',
      provider,
      statusCode: 400,
      retryable: false,
    });
  }

  return {
    latRounded: Number(latitude.toFixed(4)),
    lonRounded: Number(longitude.toFixed(4)),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchJsonOptions<S extends z.ZodTypeAny> {
  provider: string;
  label: string;
  timeoutMs: number;
  maxRetries?: number;
  schema: S;
  dedupKey?: string;
}

/**
 * Fetch and Zod-validate JSON from an upstream HTTP provider with timeout,
 * exponential backoff retries for transient failures, and in-flight request deduplication.
 */
export async function fetchValidatedJson<S extends z.ZodTypeAny>(
  url: string,
  options: FetchJsonOptions<S>
): Promise<z.infer<S>> {
  const dedupKey = options.dedupKey ?? `${options.provider}:${url}`;
  const existing = inFlightRequests.get(dedupKey);
  if (existing) {
    return existing as Promise<z.infer<S>>;
  }

  const task = executeWithRetries(url, options).finally(() => {
    inFlightRequests.delete(dedupKey);
  });

  inFlightRequests.set(dedupKey, task);
  return task;
}

async function executeWithRetries<S extends z.ZodTypeAny>(
  url: string,
  options: FetchJsonOptions<S>
): Promise<z.infer<S>> {
  const maxRetries = options.maxRetries ?? 1;
  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(2000, 250 * 2 ** (attempt - 1));
      await sleep(backoffMs);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AirAware-AI/2.0',
        },
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const err = new ProviderError({
          message: `${options.label} responded with HTTP ${response.status}`,
          code: 'PROVIDER_HTTP_ERROR',
          provider: options.provider,
          statusCode: response.status === 429 ? 503 : response.status,
          retryable,
        });
        if (!retryable || attempt === maxRetries) throw err;
        lastError = err;
        continue;
      }

      const rawJson: unknown = await response.json();
      const parsed = options.schema.safeParse(rawJson);
      if (!parsed.success) {
        throw new ProviderError({
          message: `${options.label} returned an unexpected schema: ${parsed.error.issues[0]?.message ?? 'invalid payload'}`,
          code: 'INVALID_PROVIDER_SCHEMA',
          provider: options.provider,
          statusCode: 502,
          retryable: false,
        });
      }

      return parsed.data;
    } catch (err: unknown) {
      if (err instanceof ProviderError) {
        if (!err.retryable || attempt === maxRetries) throw err;
        lastError = err;
        continue;
      }

      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const wrapped = new ProviderError({
        message: isTimeout
          ? `${options.label} timed out after ${Math.round(options.timeoutMs / 1000)}s`
          : `${options.label} is temporarily unreachable`,
        code: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNREACHABLE',
        provider: options.provider,
        statusCode: isTimeout ? 504 : 502,
        retryable: true,
        cause: err,
      });

      if (attempt === maxRetries) throw wrapped;
      lastError = wrapped;
    } finally {
      clearTimeout(timer);
    }
  }

  throw (
    lastError ??
    new ProviderError({
      message: `${options.label} failed after retries`,
      code: 'PROVIDER_UNREACHABLE',
      provider: options.provider,
      statusCode: 502,
    })
  );
}
