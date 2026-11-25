'use client';

import { AppTranslations } from '@/i18n';
import { IndoorSuggestion } from '@/types';
import { ModalShell } from '../ui/ModalShell';

interface IndoorSuggestionModalProps {
  suggestion: IndoorSuggestion | null;
  t: AppTranslations;
  onClose: () => void;
}

/** Transparent reasoning modal explaining outdoor vs room factors and non-sensor boundaries. */
export function IndoorSuggestionModal({ suggestion, t, onClose }: IndoorSuggestionModalProps) {
  return (
    <ModalShell
      isOpen={suggestion !== null}
      onClose={onClose}
      titleId="indoor-why-title"
      title={t.indoor.whySuggestion}
      subtitle={suggestion?.title}
    >
      {suggestion && (
        <div className="space-y-3 text-xs">
          <p>
            <strong>{t.indoor.outdoorContextLabel}:</strong>{' '}
            {suggestion.whySuggestion.outdoorConditionContext}
          </p>
          <p>
            <strong>{t.indoor.userFactorLabel}:</strong> {suggestion.whySuggestion.indoorUserFactor}
          </p>
          <p className="text-slate-700">{suggestion.whySuggestion.reasoning}</p>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-amber-950">
            <p className="font-bold">{t.indoor.cannotDetermine}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {suggestion.whySuggestion.whatWeCannotDetermine.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end">
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
