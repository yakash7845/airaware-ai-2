'use client';

import { Sparkles } from 'lucide-react';
import { PRESET_CITIES } from '@/lib/configuration/presets';
import { AppTranslations } from '@/i18n';
import { Language } from '@/types';

const SUGGESTED_PROMPTS: Record<Language, string[]> = {
  en: [
    'What is the current AQI in my location and why is it at this level?',
    'Explain PM2.5 in simple language.',
    'Compare my location with Coimbatore.',
    'What does the 24-hour forecast indicate?',
    'Explain the difference between observed and modelled pollution data.',
    'Summarize conditions and practical steps for my household.',
  ],
  ta: [
    'என் இடத்தின் இன்றைய AQI மற்றும் முக்கிய மாசு என்ன?',
    'PM2.5 என்றால் என்ன? எளிய தமிழில் விளக்குங்கள்.',
    'அடுத்த 24 மணி நேர முன்னறிவிப்பு என்ன சொல்கிறது?',
    'நேரடி சென்சார் தரவிற்கும் மாதிரி தரவிற்கும் என்ன வித்தியாசம்?',
  ],
  hi: [
    'मेरे स्थान का वर्तमान AQI क्या है और इसका मुख्य कारण क्या है?',
    'PM2.5 को सरल शब्दों में समझाएं।',
    'आगामी 24 घंटे का पूर्वानुमान क्या दर्शाता है?',
    'मेरे परिवार के लिए आज के व्यावहारिक सुझाव बताएं।',
  ],
};

interface AssistantControlsProps {
  locationName: string;
  aqiValue: number | null;
  profileName: string;
  profileCategory: string;
  compareCityName: string;
  language: Language;
  isSending: boolean;
  t: AppTranslations;
  onCompareCityChange: (city: string) => void;
  onSelectPrompt: (prompt: string) => void;
}

/** Context summary bar, optional comparison city selector, and localized prompt suggestions. */
export function AssistantControls({
  locationName,
  aqiValue,
  profileName,
  profileCategory,
  compareCityName,
  language,
  isSending,
  t,
  onCompareCityChange,
  onSelectPrompt,
}: AssistantControlsProps) {
  return (
    <>
      <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-900 font-semibold">
            {locationName}: {aqiValue ?? '--'} IN NAQI
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold">
            {profileName} ({profileCategory})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="assistant-compare-city" className="text-slate-600 font-medium">
            {t.assistant.compareWithLabel}:
          </label>
          <select
            id="assistant-compare-city"
            value={compareCityName}
            onChange={(e) => onCompareCityChange(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-900"
          >
            <option value="">None</option>
            {PRESET_CITIES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
          <span>{t.assistant.suggestedTitle}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS[language].map((q) => (
            <button
              key={q}
              type="button"
              disabled={isSending}
              onClick={() => onSelectPrompt(q)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-teal-600 text-xs text-slate-800 text-left disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
