'use client';

import { useState } from 'react';
import { LocateFixed, ShieldCheck } from 'lucide-react';
import { buildFamilyProfile, PRESET_CITIES, PROFILE_CATEGORIES } from '@/lib/configuration/presets';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { EnvironmentalInterest, ProfileCategory } from '@/types';
import { LANGUAGE_PICKER_OPTIONS } from '@/utils/languageUtils';
import { ModalShell } from '../ui/ModalShell';

export function OnboardingModal() {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    setOnboardingCompleted,
    language,
    setLanguage,
    currentLocation,
    selectLocation,
    requestBrowserGeolocation,
    interests,
    setInterests,
    profiles,
    setProfiles,
    setActiveProfileId,
    t,
  } = useEnvironment();

  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileCat, setNewProfileCat] = useState<ProfileCategory>('ADULT');

  const toggleInterest = (item: EnvironmentalInterest) => {
    if (interests.includes(item)) {
      setInterests(interests.filter((x) => x !== item));
    } else {
      setInterests([...interests, item]);
    }
  };

  const handleFinish = () => {
    const trimmed = newProfileName.trim();
    if (trimmed.length >= 2) {
      const createdId = `prof-onboard-${Date.now()}`;
      const newProf = buildFamilyProfile(createdId, trimmed, newProfileCat);
      setProfiles([...profiles, newProf]);
      setActiveProfileId(createdId);
      setNewProfileName('');
    }

    setOnboardingCompleted(true);
    setIsOnboardingOpen(false);
  };

  const interestOptions: ReadonlyArray<{ id: EnvironmentalInterest; label: string }> = [
    { id: 'FAMILY_HEALTH', label: t.onboarding.interestFamily },
    { id: 'OUTDOOR_SPORTS', label: t.onboarding.interestSports },
    { id: 'COMMUTING', label: t.onboarding.interestCommute },
    { id: 'AIR_SCIENCE', label: t.onboarding.interestScience },
    { id: 'URBAN_PLANNING', label: t.onboarding.interestUrban },
  ];

  return (
    <ModalShell
      isOpen={isOnboardingOpen}
      onClose={() => {
        setOnboardingCompleted(true);
        setIsOnboardingOpen(false);
      }}
      titleId="onboarding-modal-title"
      title={t.onboarding.title}
      subtitle={t.onboarding.subtitle}
      maxWidthClassName="max-w-2xl"
    >
      <div className="space-y-5 text-xs">
        {/* Step 1: Language */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-900">1. {t.onboarding.stepLanguage}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_PICKER_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                aria-pressed={language === opt.code}
                onClick={() => setLanguage(opt.code)}
                className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${
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

        {/* Step 2: Location & Permissioned Geolocation */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-900">2. {t.onboarding.stepLocation}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_CITIES.slice(0, 5).map((city) => (
              <button
                key={city.id}
                type="button"
                aria-pressed={currentLocation.name === city.name}
                onClick={() => selectLocation(city)}
                className={`px-3 py-1.5 rounded-xl border font-medium cursor-pointer ${
                  currentLocation.name === city.name
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {city.name}
              </button>
            ))}
            <button
              type="button"
              onClick={requestBrowserGeolocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-600 text-teal-800 bg-teal-50 hover:bg-teal-100 font-semibold cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.common.useGeolocation}</span>
            </button>
          </div>
        </section>

        {/* Step 3: Interests */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-900">3. {t.onboarding.stepInterests}</h3>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((item) => {
              const active = interests.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleInterest(item.id)}
                  className={`px-3 py-1.5 rounded-xl border font-medium cursor-pointer ${
                    active
                      ? 'bg-teal-50 border-teal-700 text-teal-950 font-semibold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 4: Optional Household Profile */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-900">4. {t.onboarding.stepProfile}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="onboard-profile-name"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                {t.exposure.memberName}
              </label>
              <input
                id="onboard-profile-name"
                type="text"
                maxLength={60}
                placeholder={t.onboarding.namePlaceholder}
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="onboard-profile-cat"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                {t.exposure.ageGroup}
              </label>
              <select
                id="onboard-profile-cat"
                value={newProfileCat}
                onChange={(e) => setNewProfileCat(e.target.value as ProfileCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
              >
                {PROFILE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t.exposure.roles[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Step 5: Data Limitations & Privacy */}
        <section className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>5. {t.onboarding.stepTransparency}</span>
          </div>
          <p className="text-slate-700 leading-relaxed">{t.onboarding.limitationsSummary}</p>
          <p className="text-slate-600 leading-relaxed">{t.onboarding.privacySummary}</p>
        </section>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setOnboardingCompleted(true);
              setIsOnboardingOpen(false);
            }}
            className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            {t.onboarding.skipBtn}
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
          >
            {t.onboarding.completeBtn}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
