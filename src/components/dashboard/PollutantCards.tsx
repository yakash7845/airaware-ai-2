'use client';

import { CORE_SIX_POLLUTANTS, getCpcbCategoryByValue, POLLUTANT_SPECS } from '@/domain/aqi';
import { getTranslations } from '@/i18n';
import { ComputedAqi, Language, Measurement } from '@/types';

export function PollutantCards({
  measurements,
  computedAqi,
  language,
}: {
  measurements: readonly Measurement[];
  computedAqi: ComputedAqi;
  language: Language;
}) {
  const t = getTranslations(language);

  return (
    <section aria-label={t.live.pollutantsTitle} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">{t.live.pollutantsTitle}</h2>
        <span className="text-[11px] text-slate-600">
          {t.live.cpcbLimitLabel} • {t.live.whoLimitLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CORE_SIX_POLLUTANTS.map((pol) => {
          const spec = POLLUTANT_SPECS[pol];
          const m = measurements.find((item) => item.pollutant === pol);
          const sub = computedAqi.subIndices[pol];
          const detail = computedAqi.subIndexDetails.find((d) => d.pollutant === pol);
          const cat = sub !== undefined ? getCpcbCategoryByValue(sub) : null;
          const isDom = computedAqi.dominantPollutant === pol;
          const pctLimit =
            m !== undefined
              ? Math.min(100, Math.round((m.value / spec.naaqs24hOr8hLimit) * 100))
              : 0;

          return (
            <article
              key={pol}
              className={`bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-3 ${
                isDom ? 'border-teal-700 ring-1 ring-teal-700/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{spec.formula}</span>
                    {isDom && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white">
                        {t.common.dominantPollutant}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      cat
                        ? `${cat.badgeBgClass} ${cat.badgeTextClass} ${cat.badgeBorderClass}`
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Sub: {sub ?? '--'}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{spec.label}</p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-slate-900">{m ? m.value : '--'}</span>
                  <span className="text-xs font-medium text-slate-600">
                    {m ? m.unit : spec.standardUnit}
                  </span>
                  {!m && (
                    <span className="text-xs text-slate-500 ml-1">({t.common.unavailable})</span>
                  )}
                </div>

                {detail && detail.isAvailable && detail.concentration !== null && (
                  <p className="text-[11px] text-slate-600">
                    {detail.averagingPeriod} mean ({detail.hoursSampled}/{detail.hoursRequired}h):{' '}
                    <strong className="text-slate-900">
                      {detail.concentration} {detail.unit}
                    </strong>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>
                    {t.live.cpcbLimitLabel} ({spec.averagingPeriod}): {spec.naaqs24hOr8hLimit}{' '}
                    {spec.standardUnit}
                  </span>
                  <span className="font-mono">{m ? `${pctLimit}%` : '--'}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${spec.formula} percentage of CPCB limit`}
                  aria-valuenow={pctLimit}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pctLimit}%`,
                      backgroundColor: cat?.color ?? '#64748b',
                    }}
                  />
                </div>
                {spec.who2021Guideline24hOr8h !== null && (
                  <p className="text-[10px] text-slate-500">
                    {t.live.whoLimitLabel}: {spec.who2021Guideline24hOr8h} {spec.standardUnit}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
