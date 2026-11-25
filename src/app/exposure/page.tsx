'use client';

import React, { useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { buildProfileGuidance } from '@/domain/personalization/guidanceEngine';
import { buildFamilyProfile, PROFILE_CATEGORY_DEFAULTS } from '@/lib/configuration/presets';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ExplainRequestPayload, FamilyProfile, ProfileCategory, ProfileGuidance } from '@/types';
import { buildLocationRequestBase, postApiJson } from '@/utils/apiClient';
import { ProfileCard } from '@/components/profiles/ProfileCard';
import { ProfileEditorModal } from '@/components/profiles/ProfileEditorModal';
import { ProfileProvenanceModal } from '@/components/profiles/ProfileProvenanceModal';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

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
          const data = await postApiJson<ExplainRequestPayload, ProfileGuidance>(
            '/api/explain',
            {
              ...buildLocationRequestBase(currentLocation),
              profileCategory: cat,
              language,
            },
            controller.signal
          );
          return [cat, data] as const;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            return null;
          }
          return [cat, buildProfileGuidance(snapshot, cat, language)] as const;
        }
      })
    ).then((entries) => {
      if (!mounted) return;
      const next: Partial<Record<ProfileCategory, ProfileGuidance>> = {};
      for (const entry of entries) {
        if (!entry) continue;
        next[entry[0]] = entry[1];
      }
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
        title={t.common.errorTitle}
        message={error ?? t.common.unavailable}
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
      const defaults = PROFILE_CATEGORY_DEFAULTS[formCategory];
      setProfiles(
        profiles.map((p) =>
          p.id === editingProfile.id
            ? {
                ...p,
                name: clean,
                category: formCategory,
                ageRange: defaults.ageRange,
                avatarColor: defaults.avatarColor,
              }
            : p
        )
      );
    } else {
      const id = `prof-${Date.now()}`;
      setProfiles([...profiles, buildFamilyProfile(id, clean, formCategory)]);
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

      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-950 space-y-1">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
          <span>{t.exposure.sameDataGuarantee}</span>
        </div>
        <p className="text-teal-900">{t.exposure.nonMedicalNotice}</p>
      </div>

      <section
        aria-label={t.exposure.householdTitle}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {profiles.map((profile) => {
          const guidance =
            guidanceByCat[profile.category] ??
            buildProfileGuidance(snapshot, profile.category, language, profile.id);
          return (
            <ProfileCard
              key={profile.id}
              profile={profile}
              guidance={guidance}
              isSelected={profile.id === activeProfile.id}
              canDelete={profiles.length > 1}
              t={t}
              onSelect={setActiveProfileId}
              onEdit={openEdit}
              onDelete={handleDelete}
              onInspectProvenance={setSelectedProvenance}
            />
          );
        })}
      </section>

      <ProfileEditorModal
        isOpen={modalOpen}
        isEditing={editingProfile !== null}
        formName={formName}
        formCategory={formCategory}
        formError={formError}
        t={t}
        onNameChange={setFormName}
        onCategoryChange={setFormCategory}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      />

      <ProfileProvenanceModal
        guidance={selectedProvenance}
        t={t}
        onClose={() => setSelectedProvenance(null)}
      />
    </div>
  );
}
