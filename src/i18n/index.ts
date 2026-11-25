import { Language } from '@/types';
import { EN_TRANSLATIONS } from './en';
import { HI_TRANSLATIONS } from './hi';
import { TA_TRANSLATIONS } from './ta';
import { AppTranslations } from './types';

export type { AppTranslations } from './types';

const DICTIONARIES: Record<Language, AppTranslations> = {
  en: EN_TRANSLATIONS,
  ta: TA_TRANSLATIONS,
  hi: HI_TRANSLATIONS,
};

export function getTranslations(language: Language): AppTranslations {
  return DICTIONARIES[language] ?? EN_TRANSLATIONS;
}

export function getLocaleCode(language: Language): string {
  if (language === 'ta') return 'ta-IN';
  if (language === 'hi') return 'hi-IN';
  return 'en-IN';
}
