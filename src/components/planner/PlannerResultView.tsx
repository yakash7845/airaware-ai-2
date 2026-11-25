'use client';

import { Info } from 'lucide-react';
import { AppTranslations } from '@/i18n';
import { BestWindowPlan, BestWindowRanking } from '@/types';
import { ModalShell } from '../ui/ModalShell';

interface PlannerResultViewProps {
  plan: BestWindowPlan;
  whyModal: BestWindowRanking | null;
  t: AppTranslations;
  onInspectWindow: (win: BestWindowRanking | null) => void;
}

/** Ranked best/peak 2-hour window cards and ranking-reasoning provenance modal. */
export function PlannerResultView({ plan, whyModal, t, onInspectWindow }: PlannerResultViewProps) {
  if (!plan.dataSufficient || !plan.bestWindow) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-xs space-y-1">
        <h2 className="font-bold text-amber-950">{plan.ageAdaptedExplanation.headline}</h2>
        <p className="text-amber-900">{plan.ageAdaptedExplanation.recommendation}</p>
      </div>
    );
  }

  return (
    <>
      <section className="bg-emerald-50 border-2 border-emerald-600/50 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-800 text-white text-[11px] font-bold uppercase">
              {t.planner.bestBadge} • Rank #1
            </span>
            <h2 className="text-2xl font-black text-slate-900">{plan.bestWindow.timeLabel}</h2>
            <p className="text-xs text-slate-800 max-w-2xl">{plan.bestWindow.comparisonReason}</p>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center gap-4 shrink-0">
            <div className="text-center pr-4 border-r border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-600">Forecast NAQI</p>
              <p className="text-3xl font-black text-emerald-800">{plan.bestWindow.averageAqi}</p>
              <p className="text-[11px] font-semibold text-slate-700">
                {plan.bestWindow.aqiCategory}
              </p>
            </div>
            <div className="text-xs space-y-1">
              <p>
                Temp: <strong>{plan.bestWindow.temperatureAvg ?? '--'}°C</strong>
              </p>
              <p>
                Wind: <strong>{plan.bestWindow.windSpeedAvg ?? '--'} km/h</strong>
              </p>
              <button
                type="button"
                onClick={() => onInspectWindow(plan.bestWindow)}
                className="inline-flex items-center gap-1 font-bold text-teal-800 hover:underline cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.planner.whyThisTime}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-emerald-200 text-xs space-y-1">
          <p className="font-bold text-slate-900">{plan.ageAdaptedExplanation.headline}</p>
          <p className="text-slate-800">
            {plan.ageAdaptedExplanation.recommendation}{' '}
            {plan.ageAdaptedExplanation.activitySpecificAdvice}
          </p>
          <p className="text-amber-900 font-medium">{plan.ageAdaptedExplanation.cautionNote}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plan.rankedWindows.map((win) => (
          <article
            key={win.id}
            className={`bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-3 text-xs ${
              win.isBestWindow ? 'border-emerald-600' : 'border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                  Rank #{win.rank}
                </span>
                <span className="font-black text-slate-900">IN NAQI {win.averageAqi}</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{win.timeLabel}</p>
              <p className="text-slate-600">{win.comparisonReason}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">{win.aqiCategory}</span>
              <button
                type="button"
                onClick={() => onInspectWindow(win)}
                className="font-semibold text-teal-800 hover:underline cursor-pointer"
              >
                {t.planner.whyThisTime} →
              </button>
            </div>
          </article>
        ))}
      </section>

      <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
        {plan.disclaimer}
      </p>

      <ModalShell
        isOpen={whyModal !== null}
        onClose={() => onInspectWindow(null)}
        titleId="planner-why-title"
        title={t.planner.whyThisTime}
        subtitle={whyModal?.timeLabel}
      >
        {whyModal && (
          <div className="space-y-3 text-xs">
            <p className="font-semibold text-slate-900">{whyModal.whyThisTime.scoringNote}</p>
            <p className="text-slate-700">{whyModal.whyThisTime.weatherContext}</p>
            <p className="text-slate-700">
              <strong>Factor:</strong> {whyModal.whyThisTime.dominantFactor}
            </p>
            <ul className="list-disc pl-5 text-slate-600 space-y-1">
              {whyModal.whyThisTime.limitations.map((l, idx) => (
                <li key={idx}>{l}</li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onInspectWindow(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer"
              >
                {t.common.understood}
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </>
  );
}
