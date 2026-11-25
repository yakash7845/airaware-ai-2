'use client';

import { useState } from 'react';
import { ComputedAqi, Language } from '@/types';
import { getCpcbCategoryByValue, POLLUTANT_SPECS } from '@/domain/aqi';
import { getTranslations } from '@/i18n';

export function PollutantSubIndexChart({
  computedAqi,
  language,
}: {
  computedAqi: ComputedAqi;
  language: Language;
}) {
  const t = getTranslations(language);
  const [showTable, setShowTable] = useState(false);

  const items = computedAqi.subIndexDetails;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{t.live.pollutantsTitle}</h2>
          <p className="text-xs text-slate-600">
            CPCB sub-indices (0–500) — highest sub-index defines overall NAQI
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          aria-pressed={showTable}
          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer"
        >
          {showTable ? t.common.viewChart : t.common.viewTable}
        </button>
      </div>

      {!showTable ? (
        <div
          role="img"
          aria-label="Bar comparison of CPCB pollutant sub-indices"
          className="space-y-3"
        >
          {items.map((item) => {
            const spec = POLLUTANT_SPECS[item.pollutant];
            const val = item.subIndex;
            const widthPct =
              val !== null ? Math.min(100, Math.max(4, Math.round((val / 500) * 100))) : 0;
            const cat = getCpcbCategoryByValue(val);
            const isDom = computedAqi.dominantPollutant === item.pollutant;

            return (
              <div key={item.pollutant} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{spec.formula}</span>
                    {isDom && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                        Dominant
                      </span>
                    )}
                  </span>
                  <span className="text-slate-700 font-mono">
                    {item.isAvailable && item.concentration !== null
                      ? `${item.concentration} ${item.unit} • Sub-Index ${val ?? '--'}`
                      : t.common.unavailable}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                  {val !== null && (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: cat?.color ?? '#475569',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label={`${t.live.pollutantsTitle} data table`}
          className="overflow-x-auto"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="py-2 pr-3 font-semibold">{t.live.formulaHeader}</th>
                <th className="py-2 pr-3 font-semibold">{t.live.concentrationHeader}</th>
                <th className="py-2 pr-3 font-semibold">{t.live.averagingHeader}</th>
                <th className="py-2 font-semibold">{t.live.subIndexHeader}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const spec = POLLUTANT_SPECS[item.pollutant];
                return (
                  <tr key={item.pollutant} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-slate-900">{spec.formula}</td>
                    <td className="py-2 pr-3 font-mono text-slate-800">
                      {item.concentration !== null
                        ? `${item.concentration} ${item.unit}`
                        : t.common.unavailable}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {item.averagingPeriod} ({item.hoursSampled}/{item.hoursRequired}h)
                    </td>
                    <td className="py-2 font-bold text-slate-900">{item.subIndex ?? '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
