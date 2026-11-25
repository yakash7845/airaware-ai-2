/**
 * @module languageUtils
 * Shared language display constants and lookup helpers across services and UI components.
 */

import { Language } from '@/types';

/**
 * Maps each supported application language code to its full English display name,
 * used when constructing prompts or instructions for AI models.
 */
export const LANGUAGE_DISPLAY_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
};

/** Full language selector options displayed in onboarding and settings views. */
export const LANGUAGE_PICKER_OPTIONS: ReadonlyArray<{ code: Language; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
];

/**
 * Resolve a language code to its full English display name for use in AI prompts.
 *
 * @param language - The language code used by the application (`'en'`, `'hi'`, `'ta'`).
 * @returns The full English name of the language (e.g., `'Tamil'`).
 */
export function toLanguageDisplayName(language: Language): string {
  return LANGUAGE_DISPLAY_NAMES[language];
}
