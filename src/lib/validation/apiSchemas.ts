/**
 * @module apiSchemas
 * Centralized Zod validation schemas, JSON body enforcement, and standardized API
 * error response builders shared across all AirAware Next.js route handlers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APP_CONFIG } from '@/lib/configuration/env';
import { COORDINATE_BOUNDS } from '@/lib/configuration/publicConstants';
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

const LatitudeNumberSchema = z
  .number()
  .finite()
  .min(COORDINATE_BOUNDS.minLat)
  .max(COORDINATE_BOUNDS.maxLat);

const LongitudeNumberSchema = z
  .number()
  .finite()
  .min(COORDINATE_BOUNDS.minLon)
  .max(COORDINATE_BOUNDS.maxLon);

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

const GroundedLocationFields = {
  lat: LatitudeNumberSchema,
  lon: LongitudeNumberSchema,
  locationName: LocationNameSchema,
  timezone: SafeTimezoneSchema,
};

export const CoordinatesQuerySchema = z.object({
  lat: z.coerce.number().finite().min(COORDINATE_BOUNDS.minLat).max(COORDINATE_BOUNDS.maxLat),
  lon: z.coerce.number().finite().min(COORDINATE_BOUNDS.minLon).max(COORDINATE_BOUNDS.maxLon),
  name: LocationNameSchema,
  timezone: SafeTimezoneSchema,
  refresh: z.enum(['true', 'false']).optional(),
});

export const LocationRefSchema = z.object({
  name: LocationNameSchema,
  lat: LatitudeNumberSchema,
  lon: LongitudeNumberSchema,
  timezone: SafeTimezoneSchema,
});

export const CompareRequestSchema = z.object({
  locations: z.array(LocationRefSchema).min(2).max(APP_CONFIG.security.maxCompareLocations),
  language: LanguageSchema.optional().default('en'),
});

export const ExplainRequestSchema = z.object({
  ...GroundedLocationFields,
  profileCategory: ProfileCategorySchema.optional().default('ADULT'),
  language: LanguageSchema.optional().default('en'),
});

export const BestWindowRequestSchema = z.object({
  ...GroundedLocationFields,
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
  ...GroundedLocationFields,
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
  ...GroundedLocationFields,
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

/**
 * Parse and strictly validate `lat`, `lon`, `name`, `timezone`, and `refresh`
 * URL search parameters, rejecting non-numeric strings before coercion.
 *
 * @param searchParams - Incoming request `URLSearchParams`.
 * @returns Validated coordinate query object.
 */
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
 *
 * @param request - Incoming NextRequest object.
 * @param schema - Zod schema validating the parsed JSON payload.
 * @returns Validated typed payload inferred from `schema`.
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

/**
 * Format standard `X-RateLimit-*` and conditional `Retry-After` HTTP response headers.
 *
 * @param decision - Decision returned by `enforceRouteRateLimit`.
 * @returns Header record ready for `NextResponse.json`.
 */
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

/**
 * Map known {@link AppError} subclasses and unexpected failures into a standardized
 * JSON error envelope without leaking internal stack traces or secrets.
 *
 * @param routeName - Route label recorded in redacted server logs on unhandled 500 errors.
 * @param error - Caught error value.
 * @param fallbackMessage - Safe client-facing message returned when `error` is unexpected.
 * @returns A typed `NextResponse<ApiResponse<T>>` with appropriate HTTP status code.
 */
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
