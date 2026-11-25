'use client';

import { useState } from 'react';
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { PollutantSubIndexChart } from '@/components/charts/PollutantSubIndexChart';
import { AqiTransparencyModal } from '@/components/dashboard/AqiTransparencyModal';
import { PollutantCards } from '@/components/dashboard/PollutantCards';
import { WeatherGrid } from '@/components/dashboard/WeatherGrid';
import { AqiCategoryBadge } from '@/components/ui/AqiCategoryBadge';
import { ErrorStateCard, FreshnessPill, LoadingStateCard } from '@/components/ui/StateCards';

export default function LiveAirQualityPage() {
  const { snapshot, isLoading, error, refreshSnapshot, language, t } = useEnvironment();
  const [mode, setMode] = useState<'rolling' | 'hourly'>('rolling');
  const [modalOpen, setModalOpen] = useState(false);

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

  const activeAqi = mode === 'rolling' ? snapshot.computedAqi : snapshot.hourlyIndicativeAqi;
  const catLabel = activeAqi.categoryKey
    ? t.categories[activeAqi.categoryKey]
    : t.common.unavailable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.live.title}
          </h1>
          <p className="text-xs text-slate-600">{t.live.subtitle}</p>
        </div>
        <FreshnessPill
          status={snapshot.freshness}
          age={snapshot.dataAge}
          label={t.common.freshnessLabel}
        />
      </div>

      {/* Methodology Toggle + Summary */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 self-start">
            <button
              type="button"
              aria-pressed={mode === 'rolling'}
              onClick={() => setMode('rolling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                mode === 'rolling' ? 'bg-white text-teal-900 shadow-2xs' : 'text-slate-700'
              }`}
            >
              {t.live.rollingTab}
            </button>
            <button
              type="button"
              aria-pressed={mode === 'hourly'}
              onClick={() => setMode('hourly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                mode === 'hourly' ? 'bg-white text-teal-900 shadow-2xs' : 'text-slate-700'
              }`}
            >
              {t.live.hourlyTab}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold self-start md:self-auto cursor-pointer"
          >
            {t.live.inspectMethodology}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">{t.brand.scaleBadge}</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-slate-900">{activeAqi.value ?? '--'}</span>
              <AqiCategoryBadge
                categoryKey={activeAqi.categoryKey}
                localizedLabel={catLabel}
                size="md"
              />
            </div>
            <p className="text-xs text-slate-600">
              {t.common.dominantPollutant}:{' '}
              <strong className="text-slate-900">
                {activeAqi.dominantPollutant
                  ? POLLUTANT_SPECS[activeAqi.dominantPollutant].formula
                  : t.common.unavailable}
              </strong>
            </p>
          </div>

          <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <p className="font-semibold text-slate-900">{activeAqi.methodDescription}</p>
            <p className="text-slate-600">{snapshot.spatialResolutionNote}</p>
            <p className="text-[11px] font-mono text-slate-600">
              {t.common.observedLabel}: {activeAqi.observedAt} • {activeAqi.sourceName}
            </p>
          </div>
        </div>
      </section>

      <PollutantCards measurements={snapshot.current} computedAqi={activeAqi} language={language} />

      <PollutantSubIndexChart computedAqi={activeAqi} language={language} />

      {/* Supplementary Atmospheric Indicators */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">{t.live.supplementaryTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {[
            {
              label: t.live.supplementaryLabels.dust,
              value:
                snapshot.supplementary.dustUgM3 !== null &&
                snapshot.supplementary.dustUgM3 !== undefined
                  ? `${snapshot.supplementary.dustUgM3} µg/m³`
                  : t.common.unavailable,
            },
            {
              label: t.live.supplementaryLabels.aod,
              value: snapshot.supplementary.aerosolOpticalDepth ?? t.common.unavailable,
            },
            {
              label: t.live.supplementaryLabels.uv,
              value: snapshot.supplementary.uvIndex ?? t.common.unavailable,
            },
            {
              label: t.live.supplementaryLabels.usAqiRef,
              value: snapshot.supplementary.openMeteoUsAqi ?? t.common.unavailable,
            },
            {
              label: t.live.supplementaryLabels.euAqiRef,
              value: snapshot.supplementary.openMeteoEuropeanAqi ?? t.common.unavailable,
            },
          ].map((metric) => (
            <div key={metric.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-slate-600">{metric.label}</p>
              <p className="font-bold text-slate-900 mt-0.5">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <WeatherGrid weather={snapshot.weather} language={language} />

      <AqiTransparencyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        computedAqi={activeAqi}
        language={language}
        spatialResolutionNote={snapshot.spatialResolutionNote}
      />
    </div>
  );
}
