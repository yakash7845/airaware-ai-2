'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { evaluateIndoorGuidance } from '@/domain/recommendations/indoorAdvisor';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { IndoorAdvisorPlan, IndoorSuggestion } from '@/types';
import { postApiJson } from '@/utils/apiClient';
import { IndoorSetupForm } from '@/components/indoor/IndoorSetupForm';
import { IndoorSuggestionModal } from '@/components/indoor/IndoorSuggestionModal';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

export default function IndoorAdvisorPage() {
  const {
    snapshot,
    isLoading,
    error,
    refreshSnapshot,
    currentLocation,
    activeProfile,
    indoorSetup,
    setIndoorSetup,
    language,
    t,
  } = useEnvironment();

  const [showForm, setShowForm] = useState(true);
  const [plan, setPlan] = useState<IndoorAdvisorPlan | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<IndoorSuggestion | null>(null);

  useEffect(() => {
    if (!snapshot) return;
    const controller = new AbortController();
    let mounted = true;
    const snap = snapshot;

    async function loadPlan() {
      try {
        const data = await postApiJson<Record<string, unknown>, IndoorAdvisorPlan>(
          '/api/indoor-advisor',
          {
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
            locationName: currentLocation.name,
            timezone: currentLocation.timezone || 'auto',
            setup: indoorSetup,
            profileCategory: activeProfile.category,
            language,
          },
          controller.signal
        );
        if (mounted) setPlan(data);
      } catch (err: unknown) {
        if (mounted && !(err instanceof Error && err.name === 'AbortError')) {
          setPlan(
            evaluateIndoorGuidance({
              setup: indoorSetup,
              outdoorAqi: snap.computedAqi.value,
              outdoorCategory: snap.computedAqi.categoryLabel,
              dominantPollutant: snap.computedAqi.dominantPollutant,
              profileCategory: activeProfile.category,
              language,
              locationName: currentLocation.name,
            })
          );
        }
      }
    }

    loadPlan();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [snapshot, currentLocation, indoorSetup, activeProfile.category, language]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.indoor.title}
          </h1>
          <p className="text-xs text-slate-600">{t.indoor.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          aria-expanded={showForm}
          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold self-start sm:self-auto cursor-pointer"
        >
          {showForm ? t.indoor.hideFormBtn : t.indoor.configureBtn}
        </button>
      </div>

      <div
        role="note"
        className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950"
      >
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="font-medium leading-relaxed">{t.indoor.noSensorBanner}</p>
      </div>

      {showForm && <IndoorSetupForm indoorSetup={indoorSetup} t={t} onChange={setIndoorSetup} />}

      {plan && (
        <>
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">{plan.familySummary.headline}</h2>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold">
                {t.indoor.infiltrationLabel}: {plan.infiltrationRiskLevel}
              </span>
            </div>
            <p className="text-slate-700">{plan.familySummary.overview}</p>
            <p className="font-semibold text-teal-900">
              {t.indoor.keyFocusLabel}: {plan.familySummary.keyAction}
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.suggestions.map((sug) => (
              <article
                key={sug.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-3 text-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {sug.priority} {t.indoor.prioritySuffix}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {sug.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{sug.title}</h3>
                  <p className="text-slate-700 leading-relaxed">{sug.advice}</p>
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic">
                    {sug.ageGuidance}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedSuggestion(sug)}
                    className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.indoor.whySuggestion}</span>
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

      <IndoorSuggestionModal
        suggestion={selectedSuggestion}
        t={t}
        onClose={() => setSelectedSuggestion(null)}
      />
    </div>
  );
}
