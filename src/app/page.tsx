'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Info,
  Map as MapIcon,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { buildPollutionIntelligence } from '@/domain/analytics/pollutionIntelligence';
import { POLLUTANT_SPECS } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { formatInTimezone } from '@/lib/time/timezone';
import { getLocaleCode } from '@/i18n';
import { AqiGauge } from '@/components/charts/AqiGauge';
import { HourlyTrendChart } from '@/components/charts/HourlyTrendChart';
import { PollutantSubIndexChart } from '@/components/charts/PollutantSubIndexChart';
import { AqiTransparencyModal } from '@/components/dashboard/AqiTransparencyModal';
import { WeatherGrid } from '@/components/dashboard/WeatherGrid';
import { ErrorStateCard, FreshnessPill, LoadingStateCard } from '@/components/ui/StateCards';

export default function OverviewPage() {
  const { snapshot, isLoading, error, refreshSnapshot, language, t } = useEnvironment();
  const [transparencyOpen, setTransparencyOpen] = useState(false);

  const insights = useMemo(
    () => (snapshot ? buildPollutionIntelligence(snapshot, language) : null),
    [snapshot, language]
  );

  if (isLoading) {
    return <LoadingStateCard title={t.common.loading} description={t.common.loadingDesc} />;
  }

  if (error || !snapshot || !insights) {
    return (
      <ErrorStateCard
        title="Unable to Load Environmental Overview"
        message={error ?? 'Environmental snapshot unavailable.'}
        retryLabel={t.common.retry}
        onRetry={refreshSnapshot}
      />
    );
  }

  const domSpec = snapshot.computedAqi.dominantPollutant
    ? POLLUTANT_SPECS[snapshot.computedAqi.dominantPollutant]
    : null;
  const localFormattedTime = formatInTimezone(
    snapshot.observedAt,
    snapshot.location.timezone,
    getLocaleCode(language),
    { dateStyle: 'medium', timeStyle: 'short' }
  );

  const sixQuestions = [
    {
      href: '/live',
      title: t.overview.q1,
      icon: Activity,
      meta: `${snapshot.computedAqi.value ?? '--'} IN NAQI`,
    },
    {
      href: '/live',
      title: t.overview.q2,
      icon: ShieldCheck,
      meta: domSpec ? domSpec.formula : t.common.unavailable,
    },
    {
      href: '/forecast',
      title: t.overview.q3,
      icon: TrendingUp,
      meta: snapshot.trendSummary.trendDirection,
    },
    { href: '/explore', title: t.overview.q4, icon: MapIcon, meta: t.nav.explore },
    { href: '/exposure', title: t.overview.q5, icon: Users, meta: t.nav.exposure },
    { href: '/planner', title: t.overview.q6, icon: CalendarClock, meta: t.nav.planner },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.overview.title}
          </h1>
          <p className="text-xs text-slate-600">{t.overview.subtitle}</p>
        </div>
        <FreshnessPill
          status={snapshot.freshness}
          age={snapshot.dataAge}
          label={t.common.freshnessLabel}
        />
      </div>

      {/* Warnings if any */}
      {snapshot.warnings.length > 0 && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            {snapshot.warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Hero AQI + Analytical Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-900 border border-sky-200 font-semibold">
              {t.common.modelEstimate}
            </span>
            <button
              type="button"
              onClick={() => setTransparencyOpen(true)}
              className="inline-flex items-center gap-1 text-teal-800 hover:underline font-semibold cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.live.inspectMethodology}</span>
            </button>
          </div>

          <AqiGauge computedAqi={snapshot.computedAqi} language={language} />

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] text-slate-600">{t.common.dominantPollutant}</p>
              <p className="font-bold text-slate-900">
                {domSpec ? `${domSpec.formula} (${domSpec.label})` : t.common.unavailable}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-600">{t.common.observedLabel}</p>
              <p className="font-semibold text-slate-900">{localFormattedTime}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">{t.overview.insightsTitle}</h2>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.nav.assistant}</span>
              </Link>
            </div>

            <p className="text-sm font-semibold text-slate-900">{insights.headline}</p>
            <p className="text-xs text-slate-700 leading-relaxed">{insights.aqiInterpretation}</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              {insights.dominantPollutantExplanation}
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">{insights.forecastOutlook}</p>

            <ul className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-700 list-disc pl-5">
              {insights.practicalTakeaways.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {t.common.sourceLabel}: Open-Meteo CAMS • {t.common.resolutionNote}
          </p>
        </div>
      </section>

      {/* Six Core Questions Navigation */}
      <section aria-label={t.overview.questionsTitle} className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">{t.overview.questionsTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sixQuestions.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.title}
                href={q.href}
                className="bg-white border border-slate-200 hover:border-teal-600 rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{q.title}</p>
                    <p className="text-[11px] text-slate-600 truncate">{q.meta}</p>
                  </div>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-slate-400 group-hover:text-teal-700 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Weather Snapshot */}
      <WeatherGrid weather={snapshot.weather} language={language} compact />

      {/* Detected Environmental Events */}
      <section
        aria-label={t.overview.eventsTitle}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{t.overview.eventsTitle}</h2>
          <Link href="/forecast" className="text-xs font-semibold text-teal-800 hover:underline">
            {t.nav.forecast} →
          </Link>
        </div>
        {snapshot.events.length === 0 ? (
          <p className="text-xs text-slate-600">{t.overview.noEvents}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snapshot.events.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{evt.type.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {evt.severity}
                  </span>
                </div>
                <p className="text-slate-700">{evt.summary}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sub-index Comparison & Hourly Trend Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <PollutantSubIndexChart computedAqi={snapshot.computedAqi} language={language} />
        <HourlyTrendChart
          slots={snapshot.hourlyTimeline.slice(-48)}
          language={language}
          title={t.overview.trendTitle}
          subtitle={t.forecast.pastVsFutureNote}
        />
      </div>

      <AqiTransparencyModal
        isOpen={transparencyOpen}
        onClose={() => setTransparencyOpen(false)}
        computedAqi={snapshot.computedAqi}
        language={language}
        spatialResolutionNote={snapshot.spatialResolutionNote}
      />
    </div>
  );
}
