'use client';

import React, { useEffect, useState } from 'react';
import { Check, Edit2, Info, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { buildProfileGuidance } from '@/domain/personalization/guidanceEngine';
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ApiResponse, FamilyProfile, ProfileCategory, ProfileGuidance } from '@/types';
import { ModalShell } from '@/components/ui/ModalShell';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

const AGE_MAP: Record<ProfileCategory, string> = {
  CHILD: '< 12 yrs',
  TEEN: '13–17 yrs',
  ADULT: '18–59 yrs',
  SENIOR: '60+ yrs',
  GENERAL: 'All Ages',
};

const COLOR_MAP: Record<ProfileCategory, string> = {
  CHILD: '#15803d',
  TEEN: '#0369a1',
  ADULT: '#4338ca',
  SENIOR: '#b45309',
  GENERAL: '#0f766e',
};

export default function PersonalExposurePage() {
  const {
    snapshot,
    isLoading,
    error,
    refreshSnapshot,
    currentLocation,
    profiles,
    setProfiles,
    activeProfile,
    setActiveProfileId,
    language,
    t,
  } = useEnvironment();

  const [guidanceByCat, setGuidanceByCat] = useState<
    Partial<Record<ProfileCategory, ProfileGuidance>>
  >({});
  const [selectedProvenance, setSelectedProvenance] = useState<ProfileGuidance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FamilyProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProfileCategory>('ADULT');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshot) return;
    const controller = new AbortController();
    let mounted = true;

    const uniqueCategories = Array.from(new Set(profiles.map((p) => p.category)));
    Promise.all(
      uniqueCategories.map(async (cat) => {
        try {
          const res = await fetch('/api/explain', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: currentLocation.latitude,
              lon: currentLocation.longitude,
              locationName: currentLocation.name,
              timezone: currentLocation.timezone || 'auto',
              profileCategory: cat,
              language,
            }),
          });
          const json = (await res.json()) as ApiResponse<ProfileGuidance>;
          return [
            cat,
            json.success && json.data ? json.data : buildProfileGuidance(snapshot, cat, language),
          ] as const;
        } catch {
          return [cat, buildProfileGuidance(snapshot, cat, language)] as const;
        }
      })
    ).then((entries) => {
      if (!mounted) return;
      const next: Partial<Record<ProfileCategory, ProfileGuidance>> = {};
      for (const [c, g] of entries) next[c] = g;
      setGuidanceByCat(next);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [snapshot, profiles, currentLocation, language]);

  if (isLoading) {
    return <LoadingStateCard title={t.common.loading} description={t.common.loadingDesc} />;
  }

  if (error || !snapshot) {
    return (
      <ErrorStateCard
        title="Unable to Load Household Exposure"
        message={error ?? 'Snapshot unavailable.'}
        retryLabel={t.common.retry}
        onRetry={refreshSnapshot}
      />
    );
  }

  const openAdd = () => {
    setEditingProfile(null);
    setFormName('');
    setFormCategory('ADULT');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: FamilyProfile) => {
    setEditingProfile(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = formName.trim();
    if (clean.length < 2) {
      setFormError('Please enter at least 2 characters.');
      return;
    }
    if (editingProfile) {
      setProfiles(
        profiles.map((p) =>
          p.id === editingProfile.id
            ? {
                ...p,
                name: clean,
                category: formCategory,
                ageRange: AGE_MAP[formCategory],
                avatarColor: COLOR_MAP[formCategory],
              }
            : p
        )
      );
    } else {
      const id = `prof-${Date.now()}`;
      const newProf: FamilyProfile = {
        id,
        name: clean,
        category: formCategory,
        ageRange: AGE_MAP[formCategory],
        avatarColor: COLOR_MAP[formCategory],
        createdAt: new Date().toISOString(),
      };
      setProfiles([...profiles, newProf]);
      setActiveProfileId(id);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (profiles.length <= 1) return;
    const next = profiles.filter((p) => p.id !== id);
    setProfiles(next);
    if (activeProfile.id === id && next[0]) {
      setActiveProfileId(next[0].id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.exposure.title}
          </h1>
          <p className="text-xs text-slate-600">{t.exposure.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.exposure.addMember}</span>
        </button>
      </div>

      {/* Environmental invariance & non-medical guarantee */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-950 space-y-1">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
          <span>{t.exposure.sameDataGuarantee}</span>
        </div>
        <p className="text-teal-900">{t.exposure.nonMedicalNotice}</p>
      </div>

      {/* Unified Household Profiles & Guidance Grid */}
      <section
        aria-label={t.exposure.householdTitle}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {profiles.map((profile) => {
          const isSelected = profile.id === activeProfile.id;
          const guidance =
            guidanceByCat[profile.category] ??
            buildProfileGuidance(snapshot, profile.category, language, profile.id);

          return (
            <article
              key={profile.id}
              className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-4 ${
                isSelected ? 'border-teal-700 ring-2 ring-teal-700/15' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setActiveProfileId(profile.id)}
                    className="flex items-center gap-3 text-left cursor-pointer"
                  >
                    <div
                      aria-hidden="true"
                      className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                      style={{ backgroundColor: profile.avatarColor }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{profile.name}</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900">
                            <Check className="w-3 h-3" aria-hidden="true" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {t.exposure.roles[profile.category]} • {profile.ageRange}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(profile)}
                      aria-label={`${t.exposure.editMember}: ${profile.name}`}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(profile.id)}
                        aria-label={`${t.common.delete}: ${profile.name}`}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <h2 className="font-bold text-slate-900">{guidance.headline}</h2>
                  <p className="text-slate-700 leading-relaxed">{guidance.summary}</p>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="font-semibold text-slate-900">{guidance.activityGuidance}</p>
                    <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                      {guidance.precautionarySteps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    <strong>{t.exposure.whyDiffersTitle}:</strong> {guidance.whyDiffersNote}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-600">
                  Same Base: {guidance.provenance.aqiValue ?? '--'} IN NAQI (
                  {guidance.provenance.dominantPollutant
                    ? POLLUTANT_SPECS[guidance.provenance.dominantPollutant].formula
                    : '--'}
                  )
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedProvenance(guidance)}
                  className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.exposure.whySeeingThis}</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* Add/Edit Profile Modal */}
      <ModalShell
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="profile-editor-title"
        title={editingProfile ? t.exposure.editMember : t.exposure.addMember}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label htmlFor="profile-name-field" className="block font-semibold text-slate-800 mb-1">
              {t.exposure.memberName}
            </label>
            <input
              id="profile-name-field"
              type="text"
              maxLength={60}
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="profile-cat-field" className="block font-semibold text-slate-800 mb-1">
              {t.exposure.ageGroup}
            </label>
            <select
              id="profile-cat-field"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ProfileCategory)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
            >
              <option value="GENERAL">{t.exposure.roles.GENERAL}</option>
              <option value="CHILD">{t.exposure.roles.CHILD}</option>
              <option value="TEEN">{t.exposure.roles.TEEN}</option>
              <option value="ADULT">{t.exposure.roles.ADULT}</option>
              <option value="SENIOR">{t.exposure.roles.SENIOR}</option>
            </select>
          </div>
          {formError && (
            <p role="alert" className="text-rose-700 font-medium">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Provenance Modal */}
      <ModalShell
        isOpen={selectedProvenance !== null}
        onClose={() => setSelectedProvenance(null)}
        titleId="profile-provenance-title"
        title={t.exposure.whySeeingThis}
        subtitle={selectedProvenance?.provenance.ruleCitation}
      >
        {selectedProvenance && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-600">Indicative IN NAQI</p>
                <p className="font-bold text-slate-900">
                  {selectedProvenance.provenance.aqiValue ?? '--'} (
                  {selectedProvenance.provenance.aqiCategory ?? t.common.unavailable})
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-600">Rule ID</p>
                <p className="font-mono font-semibold text-slate-900">
                  {selectedProvenance.provenance.deterministicRuleId}
                </p>
              </div>
            </div>
            <p className="text-slate-700">{selectedProvenance.provenance.methodology}</p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              {selectedProvenance.provenance.dataLimitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedProvenance(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer"
              >
                {t.common.understood}
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
