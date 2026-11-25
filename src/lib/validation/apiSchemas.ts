import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APP_CONFIG } from '@/lib/configuration/env';
import { AppError, RateLimitError, RequestValidationError } from '@/lib/errors/appError';
import { logger } from '@/lib/logging/logger';
import { RateLimitDecision } from '@/lib/security/rateLimit';
import { ApiResponse } from '@/types';

export const LanguageSchema = z.enum(['en', 'ta', 'hi']);
export const ProfileCategorySchema = z.enum(['CHILD', 'TEEN', 'ADULT', 'SENIOR', 'GENERAL']);
export const ActivityTypeSchema = z.enum([
  'WALKING',
  'CYCLING',
  'RUNNING',
  'OUTDOOR_SPORTS',
  'SCHOOL_COMMUTE',
  'OUTDOOR_RECREATION',
]);
export const TimePreferenceSchema = z.enum(['ANY', 'MORNING', 'MIDDAY', 'EVENING']);

export const SafeTimezoneSchema = z
  .string()
  .trim()
  .regex(/^(auto|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+){0,2})$/)
  .optional()
  .default('auto');

export const LocationNameSchema = z
  .string()
  .transform((s) =>
    s
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 100)
  )
  .pipe(z.string().min(1))
  .optional()
  .default('Selected Location');

export const CoordinatesQuerySchema = z.object({
  lat: z.coerce
    .number()
    .finite()
    .min(APP_CONFIG.coordinates.minLat)
    .max(APP_CONFIG.coordinates.maxLat),
  lon: z.coerce
    .number()
    .finite()
    .min(APP_CONFIG.coordinates.minLon)
    .max(APP_CONFIG.coordinates.maxLon),
  name: LocationNameSchema,
  timezone: SafeTimezoneSchema,
  refresh: z.enum(['true', 'false']).optional(),
});

export const LocationRefSchema = z.object({
  name: LocationNameSchema,
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  timezone: SafeTimezoneSchema,
});

export const CompareRequestSchema = z.object({
  locations: z.array(LocationRefSchema).min(2).max(APP_CONFIG.security.maxCompareLocations),
  language: LanguageSchema.optional().default('en'),
});

export const ExplainRequestSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  locationName: LocationNameSchema,
  timezone: SafeTimezoneSchema,
  profileCategory: ProfileCategorySchema.optional().default('ADULT'),
  language: LanguageSchema.optional().default('en'),
});

export const BestWindowRequestSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  locationName: LocationNameSchema,
  timezone: SafeTimezoneSchema,
  activity: ActivityTypeSchema.optional().default('WALKING'),
  profileCategory: ProfileCategorySchema.optional().default('ADULT'),
  language: LanguageSchema.optional().default('en'),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timePreference: TimePreferenceSchema.optional().default('ANY'),
});

export const IndoorSetupSchema = z.object({
  naturallyVentilated: z.enum(['YES', 'NO', 'PARTIAL']).nullable().optional().default(null),
  windowsStatus: z.enum(['OPEN', 'CLOSED', 'TIME_DEPENDENT']).nullable().optional().default(null),
  cookingNearby: z.enum(['YES', 'NO', 'OCCASIONALLY']).nullable().optional().default(null),
  visibleDustOrSmoke: z.enum(['YES', 'NO', 'SOMETIMES']).nullable().optional().default(null),
  airPurifierAvailable: z.enum(['YES', 'NO']).nullable().optional().default(null),
  roadFacingArea: z.enum(['YES', 'NO']).nullable().optional().default(null),
  updatedAt: z.string().optional(),
});

export const IndoorAdvisorRequestSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  locationName: LocationNameSchema,
  timezone: SafeTimezoneSchema,
  setup: IndoorSetupSchema.optional().default({
    naturallyVentilated: null,
    windowsStatus: null,
    cookingNearby: null,
    visibleDustOrSmoke: null,
    airPurifierAvailable: null,
    roadFacingArea: null,
  }),
  profileCategory: ProfileCategorySchema.optional().default('ADULT'),
  language: LanguageSchema.optional().default('en'),
});

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(APP_CONFIG.security.maxQuestionLength),
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  locationName: LocationNameSchema,
  timezone: SafeTimezoneSchema,
  compareLocations: z.array(LocationRefSchema).max(3).optional().default([]),
  profileCategory: ProfileCategorySchema.optional().default('ADULT'),
  language: LanguageSchema.optional().default('en'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1200),
      })
    )
    .max(8)
    .optional()
    .default([]),
});

const STRICT_COORD_RE = /^-?\d+(?:\.\d+)?$/;

export function parseStrictCoordinatesQuery(searchParams: URLSearchParams) {
  const rawLat = searchParams.get('lat');
  const rawLon = searchParams.get('lon');
  if (
    !rawLat ||
    !rawLon ||
    !STRICT_COORD_RE.test(rawLat.trim()) ||
    !STRICT_COORD_RE.test(rawLon.trim())
  ) {
    throw new RequestValidationError(
      'Parameters "lat" and "lon" must be valid decimal numbers.',
      'INVALID_COORDINATES'
    );
  }

  const parsed = CoordinatesQuerySchema.safeParse({
    lat: rawLat.trim(),
    lon: rawLon.trim(),
    name: searchParams.get('name') ?? undefined,
    timezone: searchParams.get('timezone') ?? undefined,
    refresh: searchParams.get('refresh') ?? undefined,
  });

  if (!parsed.success) {
    throw new RequestValidationError(
      parsed.error.issues[0]?.message ?? 'Invalid coordinate parameters.',
      'INVALID_COORDINATES'
    );
  }
  return parsed.data;
}

/**
 * Enforce JSON Content-Type (when header is present), bounded body size, JSON parsing,
 * and Zod schema validation on incoming POST endpoints.
 */
export async function parseValidatedJsonBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new RequestValidationError('Content-Type header must be application/json.');
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const len = Number(contentLengthHeader);
    if (Number.isFinite(len) && len > APP_CONFIG.security.maxJsonBodyBytes) {
      throw new AppError({
        message: 'Request payload exceeds maximum allowed size.',
        code: 'PAYLOAD_TOO_LARGE',
        statusCode: 413,
      });
    }
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    throw new RequestValidationError('Unable to read JSON request body.');
  }

  if (Buffer.byteLength(rawText, 'utf8') > APP_CONFIG.security.maxJsonBodyBytes) {
    throw new AppError({
      message: 'Request payload exceeds maximum allowed size.',
      code: 'PAYLOAD_TOO_LARGE',
      statusCode: 413,
    });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new RequestValidationError('Malformed JSON payload.');
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') || 'payload';
    throw new RequestValidationError(
      `Invalid ${path}: ${firstIssue?.message ?? 'validation failed'}.`
    );
  }

  return result.data;
}

export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(decision.limit),
    'X-RateLimit-Remaining': String(decision.remaining),
    'X-RateLimit-Reset': String(Math.ceil(decision.resetAtMs / 1000)),
    ...(decision.retryAfterSeconds > 0
      ? { 'Retry-After': String(decision.retryAfterSeconds) }
      : {}),
  };
}

export function buildApiErrorResponse<T>(
  routeName: string,
  error: unknown,
  fallbackMessage: string
): NextResponse<ApiResponse<T>> {
  const fetchedAt = new Date().toISOString();

  if (error instanceof RateLimitError) {
    return NextResponse.json<ApiResponse<T>>(
      {
        success: false,
        error: { code: error.code, message: error.message },
        fetchedAt,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(error.retryAfterSeconds) },
      }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json<ApiResponse<T>>(
      {
        success: false,
        error: { code: error.code, message: error.message },
        fetchedAt,
      },
      { status: error.statusCode }
    );
  }

  logger.error(`API ${routeName}`, error);
  return NextResponse.json<ApiResponse<T>>(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: fallbackMessage },
      fetchedAt,
    },
    { status: 500 }
  );
}
