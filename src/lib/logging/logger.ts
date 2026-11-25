const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{20,}/g,
  /(x-goog-api-key|authorization|api[-_]?key)\s*[:=]\s*[^\s,;]+/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
];

/** Redact credentials and API tokens before emitting diagnostic log entries. */
export function redactSensitiveText(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, '[REDACTED]');
  }
  return output;
}

export const logger = {
  warn(scope: string, message: string, metadata?: Record<string, string | number | boolean>): void {
    const safeMsg = redactSensitiveText(message);
    if (metadata) {
      console.warn(`[${scope}] ${safeMsg}`, metadata);
    } else {
      console.warn(`[${scope}] ${safeMsg}`);
    }
  },

  error(scope: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${scope}] ${redactSensitiveText(message)}`);
  },
};
