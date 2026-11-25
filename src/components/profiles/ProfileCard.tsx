'use client';

import { Check, Edit2, Info, Trash2 } from 'lucide-react';
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { AppTranslations } from '@/i18n';
import { FamilyProfile, ProfileGuidance } from '@/types';

interface ProfileCardProps {
  profile: FamilyProfile;
  guidance: ProfileGuidance;
  isSelected: boolean;
  canDelete: boolean;
  t: AppTranslations;
  onSelect: (id: string) => void;
  onEdit: (profile: FamilyProfile) => void;
  onDelete: (id: string) => void;
  onInspectProvenance: (guidance: ProfileGuidance) => void;
}

/** Accessible card displaying identical AQI provenance paired with profile-tailored environmental guidance. */
export function ProfileCard({
  profile,
  guidance,
  isSelected,
  canDelete,
  t,
  onSelect,
  onEdit,
  onDelete,
  onInspectProvenance,
}: ProfileCardProps) {
  return (
    <article
      className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-4 ${
        isSelected ? 'border-teal-700 ring-2 ring-teal-700/15' : 'border-slate-200'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(profile.id)}
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
              onClick={() => onEdit(profile)}
              aria-label={`${t.exposure.editMember}: ${profile.name}`}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(profile.id)}
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
          onClick={() => onInspectProvenance(guidance)}
          className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.exposure.whySeeingThis}</span>
        </button>
      </div>
    </article>
  );
}
