'use client';

import { AppTranslations } from '@/i18n';
import { ProfileGuidance } from '@/types';
import { ModalShell } from '../ui/ModalShell';

interface ProfileProvenanceModalProps {
  guidance: ProfileGuidance | null;
  t: AppTranslations;
  onClose: () => void;
}

/** Modal displaying the deterministic CPCB rule citation and limitation provenance behind profile advice. */
export function ProfileProvenanceModal({ guidance, t, onClose }: ProfileProvenanceModalProps) {
  return (
    <ModalShell
      isOpen={guidance !== null}
      onClose={onClose}
      titleId="profile-provenance-title"
      title={t.exposure.whySeeingThis}
      subtitle={guidance?.provenance.ruleCitation}
    >
      {guidance && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-slate-600">{t.brand.scaleBadge}</p>
              <p className="font-bold text-slate-900">
                {guidance.provenance.aqiValue ?? '--'} (
                {guidance.provenance.aqiCategory ?? t.common.unavailable})
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-slate-600">Rule ID</p>
              <p className="font-mono font-semibold text-slate-900">
                {guidance.provenance.deterministicRuleId}
              </p>
            </div>
          </div>
          <p className="text-slate-700">{guidance.provenance.methodology}</p>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            {guidance.provenance.dataLimitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer"
            >
              {t.common.understood}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
