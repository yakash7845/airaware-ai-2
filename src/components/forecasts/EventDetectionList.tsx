'use client';

import { AppTranslations } from '@/i18n';
import { EnvironmentalEvent } from '@/types';

interface EventDetectionListProps {
  events: readonly EnvironmentalEvent[];
  t: AppTranslations;
}

/** Rule-based environmental event list showing statistical thresholds and candidate physical drivers. */
export function EventDetectionList({ events, t }: EventDetectionListProps) {
  return (
    <section className="space-y-3">
      {events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-xs text-slate-600">
          {t.overview.noEvents}
        </div>
      ) : (
        events.map((evt) => (
          <article
            key={evt.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {evt.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {evt.severity}
                </span>
              </div>
              <span className="font-mono text-slate-600">
                {evt.localTime.replace('T', ' ')} (
                {evt.isForecast ? t.common.forecastBadge : t.common.pastModelled})
              </span>
            </div>

            <p className="text-slate-800 font-medium">{evt.summary}</p>
            <p className="text-[11px] text-slate-600">
              <strong>Rule Threshold:</strong> {evt.thresholdDescription}
            </p>

            <div className="pt-2 border-t border-slate-100">
              <p className="font-semibold text-slate-800 mb-1">Possible Contributing Factors:</p>
              <ul className="list-disc pl-5 text-slate-600 space-y-0.5">
                {evt.possibleContributingFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
