'use client';

import { useState } from 'react';
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { HourlySlot } from '@/types';
import { HourlyTrendChart } from '@/components/charts/HourlyTrendChart';
import { DailySummaryGrid } from '@/components/forecasts/DailySummaryGrid';
import { EventDetectionList } from '@/components/forecasts/EventDetectionList';
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
        title={t.common.errorTitle}
        message={error ?? t.common.unavailable}
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
        <DailySummaryGrid dailySummaries={snapshot.trendSummary.dailySummaries} t={t} />
      )}

      {activeTab === 'events' && <EventDetectionList events={snapshot.events} t={t} />}

      <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
        <p className="font-bold text-slate-900">Data Availability &amp; Confidence Limitations</p>
        <p>{snapshot.trendSummary.historicalLimitationNote}</p>
        <p>{t.forecast.confidenceLimitation}</p>
      </section>
    </div>
  );
}
