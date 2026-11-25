const INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /\b(ignore|disregard|forget|override)\b.{0,40}\b(previous|prior|system|all)\b.{0,30}\b(instructions?|rules?|prompts?)\b/i,
    reason: 'System instruction override attempt',
  },
  {
    pattern:
      /\b(reveal|print|show|dump|leak)\b.{0,40}\b(system\s*prompt|api\s*key|secret|env|credentials?)\b/i,
    reason: 'System prompt or secret extraction attempt',
  },
  {
    pattern:
      /\b(pretend|roleplay|act\s+as|you\s+are\s+now)\b.{0,30}\b(doctor|physician|unrestricted|dan|jailbreak)\b/i,
    reason: 'Unsafe persona override attempt',
  },
  {
    pattern: /<\s*script\b|javascript:|on\w+\s*=/i,
    reason: 'Script injection attempt',
  },
];

export interface PromptGuardResult {
  safe: boolean;
  sanitizedText: string;
  reason?: string;
}

/**
 * Strip control characters and screen user input against prompt-injection and XSS patterns.
 */
export function inspectUserPrompt(rawInput: string): PromptGuardResult {
  const sanitizedText = rawInput.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();

  for (const check of INJECTION_PATTERNS) {
    if (check.pattern.test(sanitizedText)) {
      return {
        safe: false,
        sanitizedText,
        reason: check.reason,
      };
    }
  }

  return {
    safe: true,
    sanitizedText,
  };
}
