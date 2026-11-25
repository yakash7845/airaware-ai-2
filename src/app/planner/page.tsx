'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { formatLocalHourLabel } from '@/lib/time/timezone';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import {
  ActivityType,
  ApiResponse,
  BestWindowPlan,
  BestWindowRanking,
  TimeWindowPreference,
} from '@/types';
import { evaluateOutdoorWindows } from '@/domain/recommendations/outdoorPlanner';
import { ModalShell } from '@/components/ui/ModalShell';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

const ACTIVITIES: readonly ActivityType[] = [
  'WALKING',
  'CYCLING',
  'RUNNING',
  'OUTDOOR_SPORTS',
  'SCHOOL_COMMUTE',
  'OUTDOOR_RECREATION',
];

const TIME_PREFS: readonly TimeWindowPreference[] = ['ANY', 'MORNING', 'MIDDAY', 'EVENING'];

export default function OutdoorPlannerPage() {
  const {
    snapshot,
    isLoading,
    error,
    refreshSnapshot,
    currentLocation,
    activeProfile,
    language,
    t,
  } = useEnvironment();

  const [activity, setActivity] = useState<ActivityType>('WALKING');
  const [timePreference, setTimePreference] = useState<TimeWindowPreference>('ANY');
  const [targetDate, setTargetDate] = useState<string>('');
  const [plan, setPlan] = useState<BestWindowPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [whyModal, setWhyModal] = useState<BestWindowRanking | null>(null);

  const availableDates = snapshot
    ? Array.from(
        new Set(snapshot.hourlyForecast.map((s) => formatLocalHourLabel(s.localTime).dateKey))
      )
    : [];

  const effectiveDate =
    targetDate && availableDates.includes(targetDate) ? targetDate : (availableDates[0] ?? '');

  useEffect(() => {
    if (!snapshot) return;
    const controller = new AbortController();
    let mounted = true;

    async function fetchPlan() {
      setLoadingPlan(true);
      try {
        const res = await fetch('/api/best-window', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
            locationName: currentLocation.name,
            timezone: currentLocation.timezone || 'auto',
            activity,
            profileCategory: activeProfile.category,
            language,
            ...(effectiveDate ? { targetDate: effectiveDate } : {}),
            timePreference,
          }),
        });
        const json = (await res.json()) as ApiResponse<BestWindowPlan>;
        if (!mounted) return;
        if (json.success && json.data) {
          setPlan(json.data);
        } else if (snapshot) {
          setPlan(
            evaluateOutdoorWindows({
              hourlySlots: snapshot.hourlyForecast,
              activity,
              profileCategory: activeProfile.category,
              language,
              locationName: currentLocation.name,
              targetDate: effectiveDate || undefined,
              timePreference,
            })
          );
        }
      } catch {
        if (mounted && snapshot) {
          setPlan(
            evaluateOutdoorWindows({
              hourlySlots: snapshot.hourlyForecast,
              activity,
              profileCategory: activeProfile.category,
              language,
              locationName: currentLocation.name,
              targetDate: effectiveDate || undefined,
              timePreference,
            })
          );
        }
      } finally {
        if (mounted) setLoadingPlan(false);
      }
    }

    fetchPlan();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    snapshot,
    currentLocation,
    activity,
    activeProfile.category,
    language,
    effectiveDate,
    timePreference,
  ]);

  if (isLoading) {
    return <LoadingStateCard title={t.common.loading} description={t.common.loadingDesc} />;
  }

  if (error || !snapshot) {
    return (
      <ErrorStateCard
        title="Unable to Load Outdoor Planner"
        message={error ?? 'Snapshot unavailable.'}
        retryLabel={t.common.retry}
        onRetry={refreshSnapshot}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t.planner.title}
        </h1>
        <p className="text-xs text-slate-600">{t.planner.subtitle}</p>
      </div>

      {/* Controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
        <div className="space-y-2">
          <span className="font-bold text-slate-800 block">{t.planner.activityLabel}</span>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((act) => (
              <button
                key={act}
                type="button"
                aria-pressed={activity === act}
                onClick={() => setActivity(act)}
                className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${
                  activity === act
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {t.planner.activities[act]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="planner-date" className="block font-semibold text-slate-800 mb-1">
              {t.planner.dateLabel}
            </label>
            <select
              id="planner-date"
              value={effectiveDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="planner-pref" className="block font-semibold text-slate-800 mb-1">
              {t.planner.timePrefLabel}
            </label>
            <select
              id="planner-pref"
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value as TimeWindowPreference)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
            >
              {TIME_PREFS.map((p) => (
                <option key={p} value={p}>
                  {t.planner.timePrefs[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="font-semibold text-slate-800 mb-1">{t.planner.profileLabel}</p>
            <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900">
              {activeProfile.name} ({activeProfile.category})
            </div>
          </div>
        </div>
      </section>

      {loadingPlan && !plan && <LoadingStateCard title={t.common.loading} />}

      {plan && !plan.dataSufficient && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-xs space-y-1">
          <h2 className="font-bold text-amber-950">{plan.ageAdaptedExplanation.headline}</h2>
          <p className="text-amber-900">{plan.ageAdaptedExplanation.recommendation}</p>
        </div>
      )}

      {plan && plan.dataSufficient && plan.bestWindow && (
        <>
          <section className="bg-emerald-50 border-2 border-emerald-600/50 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-800 text-white text-[11px] font-bold uppercase">
                  {t.planner.bestBadge} • Rank #1
                </span>
                <h2 className="text-2xl font-black text-slate-900">{plan.bestWindow.timeLabel}</h2>
                <p className="text-xs text-slate-800 max-w-2xl">
                  {plan.bestWindow.comparisonReason}
                </p>
              </div>

              <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center gap-4 shrink-0">
                <div className="text-center pr-4 border-r border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-600">Forecast NAQI</p>
                  <p className="text-3xl font-black text-emerald-800">
                    {plan.bestWindow.averageAqi}
                  </p>
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
                    onClick={() => setWhyModal(plan.bestWindow)}
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

          {/* All Ranked 2-hour Windows */}
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
                    onClick={() => setWhyModal(win)}
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
        </>
      )}

      <ModalShell
        isOpen={whyModal !== null}
        onClose={() => setWhyModal(null)}
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
                onClick={() => setWhyModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer"
              >
                {t.common.understood}
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
