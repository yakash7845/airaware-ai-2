/**
 * @module appError
 * Structured error hierarchy for AirAware API routes.
 *
 * All server-side errors extend AppError, which carries:
 * - A machine-readable `code` for client-side error handling
 * - An HTTP `statusCode` for the response
 * - A `retryable` flag so callers know whether to back off and retry
 * - An optional `provider` field to identify which upstream service failed
 *
 * Specialised subclasses:
 * - `RequestValidationError` — 400 for malformed or out-of-range request bodies
 * - `RateLimitError`         — 429 with a `retryAfterSeconds` hint
 * - `ProviderError`          — 502/504 for upstream Open-Meteo or Gemini failures
 */

/** Union of all machine-readable error codes used by AirAware API routes. */
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_COORDINATES'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'PROMPT_INJECTION_BLOCKED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_HTTP_ERROR'
  | 'PROVIDER_UNREACHABLE'
  | 'INVALID_PROVIDER_SCHEMA'
  | 'EMPTY_RESPONSE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly provider?: string;
  public readonly timestamp: string;

  constructor(options: {
    message: string;
    code: AppErrorCode;
    statusCode: number;
    retryable?: boolean;
    provider?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.provider = options.provider;
    this.timestamp = new Date().toISOString();
  }
}

export class RequestValidationError extends AppError {
  constructor(message: string, code: AppErrorCode = 'VALIDATION_ERROR') {
    super({ message, code, statusCode: 400, retryable: false });
    this.name = 'RequestValidationError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super({
      message: `Too many requests. Please retry in ${retryAfterSeconds} seconds.`,
      code: 'RATE_LIMITED',
      statusCode: 429,
      retryable: true,
    });
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ProviderError extends AppError {
  constructor(options: {
    message: string;
    code: Extract<
      AppErrorCode,
      | 'INVALID_COORDINATES'
      | 'PROVIDER_TIMEOUT'
      | 'PROVIDER_HTTP_ERROR'
      | 'PROVIDER_UNREACHABLE'
      | 'INVALID_PROVIDER_SCHEMA'
      | 'EMPTY_RESPONSE'
    >;
    provider: string;
    statusCode?: number;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super({
      message: options.message,
      code: options.code,
      statusCode: options.statusCode ?? 502,
      retryable: options.retryable ?? false,
      provider: options.provider,
      cause: options.cause,
    });
    this.name = 'ProviderError';
  }
}
