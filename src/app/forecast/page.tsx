'use client';

import { useState } from 'react';
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { HourlySlot } from '@/types';
import { HourlyTrendChart } from '@/components/charts/HourlyTrendChart';
import { ErrorStateCard, FreshnessPill, LoadingStateCard } from '@/components/ui/StateCards';

export default function ForecastIntelligencePage() {
  const { snapshot, isLoading, error, refreshSnapshot, language, t } = useEnvironment();
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily' | 'events'>('hourly');
  const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);

  if (isLoading) {
    return <LoadingStateCard title={t.common.loading} description={t.common.loadingDesc} />;
  }

  if (error || !snapshot) {
    return (
      <ErrorStateCard
        title="Unable to Load Forecast Intelligence"
        message={error ?? 'Snapshot unavailable.'}
        retryLabel={t.common.retry}
        onRetry={refreshSnapshot}
      />
    );
  }

  const slotToInspect = selectedSlot ?? snapshot.hourlyForecast[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.forecast.title}
          </h1>
          <p className="text-xs text-slate-600">{t.forecast.subtitle}</p>
        </div>
        <FreshnessPill
          status={snapshot.freshness}
          age={snapshot.dataAge}
          label={t.common.freshnessLabel}
        />
      </div>

      {/* Tab selector */}
      <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200">
        {(
          [
            { id: 'hourly', label: t.forecast.hourlyTab },
            { id: 'daily', label: t.forecast.dailyTab },
            { id: 'events', label: `${t.forecast.eventsTab} (${snapshot.events.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === tab.id ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'hourly' && (
        <div className="space-y-5">
          <HourlyTrendChart
            slots={snapshot.hourlyTimeline}
            language={language}
            title={t.overview.trendTitle}
            subtitle={t.forecast.pastVsFutureNote}
            onSelectSlot={setSelectedSlot}
          />

          {slotToInspect && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Hour Inspector: {slotToInspect.localTime.replace('T', ' ')}
                  </h2>
                  <p className="text-slate-600">{t.forecast.inspectHourPrompt}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold">
                  {slotToInspect.isForecast ? t.common.forecastBadge : t.common.pastModelled}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                  <p className="text-[11px] text-teal-900">Indicative NAQI</p>
                  <p className="text-lg font-black text-teal-950">
                    {slotToInspect.computedAqi?.value ?? '--'}
                  </p>
                </div>
                {slotToInspect.measurements.map((m) => (
                  <div
                    key={m.pollutant}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <p className="text-[11px] text-slate-600">
                      {POLLUTANT_SPECS[m.pollutant].formula}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {m.value} <span className="text-[10px] font-normal">{m.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'daily' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.trendSummary.dailySummaries.map((day) => (
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
                      {day.dominantPollutant
                        ? POLLUTANT_SPECS[day.dominantPollutant].formula
                        : '--'}
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
      )}

      {activeTab === 'events' && (
        <section className="space-y-3">
          {snapshot.events.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-xs text-slate-600">
              {t.overview.noEvents}
            </div>
          ) : (
            snapshot.events.map((evt) => (
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
                  <p className="font-semibold text-slate-800 mb-1">
                    Possible Contributing Factors:
                  </p>
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
      )}

      {/* Honest Forecast Limitations */}
      <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
        <p className="font-bold text-slate-900">Data Availability &amp; Confidence Limitations</p>
        <p>{snapshot.trendSummary.historicalLimitationNote}</p>
        <p>{t.forecast.confidenceLimitation}</p>
      </section>
    </div>
  );
}
