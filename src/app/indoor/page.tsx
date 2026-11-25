'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import {
  DEFAULT_INDOOR_SETUP,
  evaluateIndoorGuidance,
} from '@/domain/recommendations/indoorAdvisor';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ApiResponse, IndoorAdvisorPlan, IndoorEnvironmentSetup, IndoorSuggestion } from '@/types';
import { ModalShell } from '@/components/ui/ModalShell';
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

    async function loadPlan() {
      try {
        const res = await fetch('/api/indoor-advisor', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
            locationName: currentLocation.name,
            timezone: currentLocation.timezone || 'auto',
            setup: indoorSetup,
            profileCategory: activeProfile.category,
            language,
          }),
        });
        const json = (await res.json()) as ApiResponse<IndoorAdvisorPlan>;
        if (!mounted) return;
        if (json.success && json.data) {
          setPlan(json.data);
        } else if (snapshot) {
          setPlan(
            evaluateIndoorGuidance({
              setup: indoorSetup,
              outdoorAqi: snapshot.computedAqi.value,
              outdoorCategory: snapshot.computedAqi.categoryLabel,
              dominantPollutant: snapshot.computedAqi.dominantPollutant,
              profileCategory: activeProfile.category,
              language,
              locationName: currentLocation.name,
            })
          );
        }
      } catch {
        if (mounted && snapshot) {
          setPlan(
            evaluateIndoorGuidance({
              setup: indoorSetup,
              outdoorAqi: snapshot.computedAqi.value,
              outdoorCategory: snapshot.computedAqi.categoryLabel,
              dominantPollutant: snapshot.computedAqi.dominantPollutant,
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
        title="Unable to Load Indoor Advisor"
        message={error ?? 'Snapshot unavailable.'}
        retryLabel={t.common.retry}
        onRetry={refreshSnapshot}
      />
    );
  }

  const toggleField = <K extends Exclude<keyof IndoorEnvironmentSetup, 'updatedAt'>>(
    key: K,
    val: NonNullable<IndoorEnvironmentSetup[K]>
  ) => {
    setIndoorSetup({
      ...indoorSetup,
      [key]: indoorSetup[key] === val ? null : val,
      updatedAt: new Date().toISOString(),
    });
  };

  const renderToggleGroup = <K extends Exclude<keyof IndoorEnvironmentSetup, 'updatedAt'>>(
    key: K,
    label: string,
    options: ReadonlyArray<{ val: NonNullable<IndoorEnvironmentSetup[K]>; text: string }>
  ) => (
    <fieldset className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
      <legend className="text-xs font-bold text-slate-900 px-1">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = indoorSetup[key] === opt.val;
          return (
            <button
              key={opt.val}
              type="button"
              aria-pressed={active}
              onClick={() => toggleField(key, opt.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                active
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

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

      {/* Mandatory Non-Sensor Transparency Banner */}
      <div
        role="note"
        className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950"
      >
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="font-medium leading-relaxed">{t.indoor.noSensorBanner}</p>
      </div>

      {showForm && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderToggleGroup('naturallyVentilated', t.indoor.qVentilation, [
              { val: 'YES', text: 'Yes' },
              { val: 'PARTIAL', text: 'Partial' },
              { val: 'NO', text: 'Mechanical / Sealed' },
            ])}
            {renderToggleGroup('windowsStatus', t.indoor.qWindows, [
              { val: 'OPEN', text: 'Open' },
              { val: 'TIME_DEPENDENT', text: 'Timed' },
              { val: 'CLOSED', text: 'Closed' },
            ])}
            {renderToggleGroup('cookingNearby', t.indoor.qCooking, [
              { val: 'YES', text: 'Active Daily' },
              { val: 'OCCASIONALLY', text: 'Occasionally' },
              { val: 'NO', text: 'No' },
            ])}
            {renderToggleGroup('visibleDustOrSmoke', t.indoor.qDust, [
              { val: 'YES', text: 'Frequent' },
              { val: 'SOMETIMES', text: 'Sometimes' },
              { val: 'NO', text: 'No' },
            ])}
            {renderToggleGroup('airPurifierAvailable', t.indoor.qPurifier, [
              { val: 'YES', text: 'Yes' },
              { val: 'NO', text: 'No' },
            ])}
            {renderToggleGroup('roadFacingArea', t.indoor.qRoad, [
              { val: 'YES', text: 'Busy Road' },
              { val: 'NO', text: 'Quiet / Courtyard' },
            ])}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIndoorSetup(DEFAULT_INDOOR_SETUP)}
              className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
            >
              {t.common.clear}
            </button>
          </div>
        </section>
      )}

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
            <p className="font-semibold text-teal-900">Key Focus: {plan.familySummary.keyAction}</p>
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
                      {sug.priority} Priority
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

      <ModalShell
        isOpen={selectedSuggestion !== null}
        onClose={() => setSelectedSuggestion(null)}
        titleId="indoor-why-title"
        title={t.indoor.whySuggestion}
        subtitle={selectedSuggestion?.title}
      >
        {selectedSuggestion && (
          <div className="space-y-3 text-xs">
            <p>
              <strong>Outdoor Context:</strong>{' '}
              {selectedSuggestion.whySuggestion.outdoorConditionContext}
            </p>
            <p>
              <strong>User Factor:</strong> {selectedSuggestion.whySuggestion.indoorUserFactor}
            </p>
            <p className="text-slate-700">{selectedSuggestion.whySuggestion.reasoning}</p>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-amber-950">
              <p className="font-bold">{t.indoor.cannotDetermine}</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {selectedSuggestion.whySuggestion.whatWeCannotDetermine.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSuggestion(null)}
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
