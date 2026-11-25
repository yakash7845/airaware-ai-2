'use client';

import { POLLUTANT_SPECS } from '@/domain/aqi';
import { AppTranslations } from '@/i18n';
import { DailyForecastSummary } from '@/types';

interface DailySummaryGridProps {
  dailySummaries: readonly DailyForecastSummary[];
  t: AppTranslations;
}

/** Grid of past-day hindcast and upcoming forecast daily AQI + meteorological summaries. */
export function DailySummaryGrid({ dailySummaries, t }: DailySummaryGridProps) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dailySummaries.map((day) => (
          <article
            key={day.date}
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-900">{day.date}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {day.isPastDay ? t.common.pastModelled : t.common.forecastBadge}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50">
                <p className="text-[10px] text-slate-600">{t.forecast.minAqi}</p>
                <p className="font-bold text-slate-900">{day.minAqi ?? '--'}</p>
              </div>
              <div className="p-2 rounded-xl bg-teal-50">
                <p className="text-[10px] text-teal-900">{t.forecast.avgAqi}</p>
                <p className="font-black text-teal-950">{day.avgAqi ?? '--'}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50">
                <p className="text-[10px] text-slate-600">{t.forecast.maxAqi}</p>
                <p className="font-bold text-slate-900">{day.maxAqi ?? '--'}</p>
              </div>
            </div>

            <div className="space-y-1 text-slate-700 pt-1">
              <p>
                {t.common.dominantPollutant}:{' '}
                <strong>
                  {day.dominantPollutant ? POLLUTANT_SPECS[day.dominantPollutant].formula : '--'}
                </strong>
              </p>
              <p>
                PM₂.₅ / PM₁₀ Mean: {day.avgPm25 ?? '--'} / {day.avgPm10 ?? '--'} µg/m³
              </p>
              <p>
                Temp: {day.minTemp ?? '--'}°C – {day.maxTemp ?? '--'}°C • Rain:{' '}
                {day.totalPrecipitation ?? 0} mm
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
