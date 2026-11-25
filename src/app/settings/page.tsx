'use client';

import { Download, LocateFixed, RotateCcw } from 'lucide-react';
import { APP_CONFIG } from '@/lib/configuration/env';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { Language, TextSize } from '@/types';

export default function SettingsPage() {
  const {
    language,
    setLanguage,
    accessibility,
    setAccessibility,
    currentLocation,
    savedLocations,
    profiles,
    requestBrowserGeolocation,
    geolocationStatus,
    resetAllLocalData,
    t,
  } = useEnvironment();

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      language,
      accessibility,
      currentLocation,
      savedLocations,
      profiles,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'airaware-2-preferences.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-xs text-slate-600">{t.settings.subtitle}</p>
      </div>

      {/* Language Settings */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900">{t.settings.languageTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { code: 'en', label: 'English' },
              { code: 'ta', label: 'தமிழ் (Tamil)' },
              { code: 'hi', label: 'हिन्दी (Hindi)' },
            ] as Array<{ code: Language; label: string }>
          ).map((opt) => (
            <button
              key={opt.code}
              type="button"
              aria-pressed={language === opt.code}
              onClick={() => setLanguage(opt.code)}
              className={`px-4 py-2 rounded-xl border font-semibold cursor-pointer ${
                language === opt.code
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Accessibility Settings */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-slate-900">{t.settings.accessibilityTitle}</h2>

        <div className="space-y-2">
          <p className="font-semibold text-slate-800">{t.settings.textSizeLabel}</p>
          <div className="flex flex-wrap gap-2">
            {(['normal', 'large', 'extra-large'] as TextSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={accessibility.fontSize === sz}
                onClick={() => setAccessibility({ ...accessibility, fontSize: sz })}
                className={`px-3.5 py-2 rounded-xl border font-semibold cursor-pointer ${
                  accessibility.fontSize === sz
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {t.settings.textSizes[sz]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            aria-pressed={accessibility.highContrast}
            onClick={() =>
              setAccessibility({ ...accessibility, highContrast: !accessibility.highContrast })
            }
            className={`px-4 py-2 rounded-xl border font-semibold cursor-pointer ${
              accessibility.highContrast
                ? 'bg-slate-950 text-white border-slate-950'
                : 'bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            {t.settings.highContrastLabel}: {accessibility.highContrast ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            aria-pressed={accessibility.reducedMotion}
            onClick={() =>
              setAccessibility({ ...accessibility, reducedMotion: !accessibility.reducedMotion })
            }
            className={`px-4 py-2 rounded-xl border font-semibold cursor-pointer ${
              accessibility.reducedMotion
                ? 'bg-slate-950 text-white border-slate-950'
                : 'bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            {t.settings.reducedMotionLabel}: {accessibility.reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>
      </section>

      {/* Location & Privacy */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
        <h2 className="text-sm font-bold text-slate-900">{t.settings.locationPrivacyTitle}</h2>
        <p className="text-slate-600">{t.settings.resetConfirmNote}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={requestBrowserGeolocation}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>{t.common.useGeolocation}</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>{t.common.exportData}</span>
          </button>

          <button
            type="button"
            onClick={resetAllLocalData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.settings.resetAllBtn}</span>
          </button>
        </div>
        {geolocationStatus && <p className="text-amber-800">{geolocationStatus}</p>}
      </section>

      {/* Data Sources */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 text-xs">
        <h2 className="text-sm font-bold text-slate-900">{t.settings.dataSourcesTitle}</h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>{APP_CONFIG.attribution.openMeteoAir}</li>
          <li>{APP_CONFIG.attribution.openMeteoWeather}</li>
          <li>{APP_CONFIG.attribution.openMeteoGeo}</li>
          <li>{APP_CONFIG.attribution.openStreetMap}</li>
          <li>{APP_CONFIG.attribution.cpcb}</li>
        </ul>
      </section>
    </div>
  );
}
