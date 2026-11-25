'use client';

import { useEffect, useState } from 'react';
import { formatLocalHourLabel } from '@/lib/time/timezone';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ActivityType, BestWindowPlan, BestWindowRanking, TimeWindowPreference } from '@/types';
import { evaluateOutdoorWindows } from '@/domain/recommendations/outdoorPlanner';
import { postApiJson } from '@/utils/apiClient';
import { PlannerControls } from '@/components/planner/PlannerControls';
import { PlannerResultView } from '@/components/planner/PlannerResultView';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

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
    const snap = snapshot;

    async function fetchPlan() {
      setLoadingPlan(true);
      try {
        const data = await postApiJson<Record<string, unknown>, BestWindowPlan>(
          '/api/best-window',
          {
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
            locationName: currentLocation.name,
            timezone: currentLocation.timezone || 'auto',
            activity,
            profileCategory: activeProfile.category,
            language,
            ...(effectiveDate ? { targetDate: effectiveDate } : {}),
            timePreference,
          },
          controller.signal
        );
        if (mounted) setPlan(data);
      } catch (err: unknown) {
        if (mounted && !(err instanceof Error && err.name === 'AbortError')) {
          setPlan(
            evaluateOutdoorWindows({
              hourlySlots: snap.hourlyForecast,
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
        title={t.common.errorTitle}
        message={error ?? t.common.unavailable}
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

      <PlannerControls
        activity={activity}
        effectiveDate={effectiveDate}
        availableDates={availableDates}
        timePreference={timePreference}
        profileLabel={`${activeProfile.name} (${activeProfile.category})`}
        t={t}
        onActivityChange={setActivity}
        onDateChange={setTargetDate}
        onTimePreferenceChange={setTimePreference}
      />

      {loadingPlan && !plan && <LoadingStateCard title={t.common.loading} />}

      {plan && (
        <PlannerResultView plan={plan} whyModal={whyModal} t={t} onInspectWindow={setWhyModal} />
      )}
    </div>
  );
}
