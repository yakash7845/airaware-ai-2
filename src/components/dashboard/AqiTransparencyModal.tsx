'use client';

import { POLLUTANT_SPECS } from '@/domain/aqi';
import { getTranslations } from '@/i18n';
import { ComputedAqi, Language } from '@/types';
import { ModalShell } from '../ui/ModalShell';

export function AqiTransparencyModal({
  isOpen,
  onClose,
  computedAqi,
  language,
  spatialResolutionNote,
}: {
  isOpen: boolean;
  onClose: () => void;
  computedAqi: ComputedAqi;
  language: Language;
  spatialResolutionNote: string;
}) {
  const t = getTranslations(language);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="aqi-transparency-title"
      title={t.live.transparencyTitle}
      subtitle={computedAqi.methodDescription}
      maxWidthClassName="max-w-3xl"
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-600">{t.brand.scaleBadge}</p>
            <p className="text-lg font-black text-slate-900">
              {computedAqi.value ?? '--'} ({computedAqi.categoryLabel ?? t.common.unavailable})
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-600">{t.common.dominantPollutant}</p>
            <p className="text-sm font-bold text-slate-900">
              {computedAqi.dominantPollutant
                ? POLLUTANT_SPECS[computedAqi.dominantPollutant].formula
                : t.common.unavailable}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-600">{t.common.observedLabel}</p>
            <p className="text-xs font-mono font-semibold text-slate-900">
              {computedAqi.observedAt}
            </p>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="CPCB pollutant sub-index breakdown"
          className="overflow-x-auto border border-slate-200 rounded-xl"
        >
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-semibold">{t.live.formulaHeader}</th>
                <th className="p-2.5 font-semibold">{t.live.concentrationHeader}</th>
                <th className="p-2.5 font-semibold">{t.live.averagingHeader}</th>
                <th className="p-2.5 font-semibold">{t.live.breakpointHeader}</th>
                <th className="p-2.5 font-semibold">{t.live.subIndexHeader}</th>
              </tr>
            </thead>
            <tbody>
              {computedAqi.subIndexDetails.map((d) => (
                <tr key={d.pollutant} className="border-b border-slate-100 last:border-0">
                  <td className="p-2.5 font-semibold text-slate-900">
                    {POLLUTANT_SPECS[d.pollutant].formula}
                  </td>
                  <td className="p-2.5 font-mono text-slate-800">
                    {d.concentration !== null
                      ? `${d.concentration} ${d.unit}`
                      : t.common.unavailable}
                  </td>
                  <td className="p-2.5 text-slate-700">
                    {d.averagingPeriod} ({d.hoursSampled}/{d.hoursRequired}h)
                  </td>
                  <td className="p-2.5 font-mono text-slate-600">
                    {d.breakpointRange
                      ? `[${d.breakpointRange.concLow}–${d.breakpointRange.concHigh}] → [${d.breakpointRange.aqiLow}–${d.breakpointRange.aqiHigh}]`
                      : '--'}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900">{d.subIndex ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 text-amber-950">
          <p className="font-bold">Known Limitations &amp; Data Provenance</p>
          <p>{spatialResolutionNote}</p>
          <ul className="list-disc pl-5 space-y-1">
            {computedAqi.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
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
    </ModalShell>
  );
}
