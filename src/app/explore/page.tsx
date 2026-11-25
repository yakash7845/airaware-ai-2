'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CPCB_CATEGORIES } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { isSameGeoLocation, PRESET_CITIES } from '@/lib/configuration/presets';
import { CompareRequestPayload, GeoLocation, LocationComparisonResult } from '@/types';
import { fetchApiJson, postApiJson } from '@/utils/apiClient';
import { ComparisonTable } from '@/components/maps/ComparisonTable';
import { DynamicPollutionMap } from '@/components/maps/DynamicPollutionMap';
import { ExploreCityBar } from '@/components/maps/ExploreCityBar';
import { AqiCategoryBadge } from '@/components/ui/AqiCategoryBadge';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

export default function ExploreMapPage() {
  const {
    currentLocation,
    selectLocation,
    savedLocations,
    addSavedLocation,
    removeSavedLocation,
    language,
    t,
  } = useEnvironment();

  const [comparison, setComparison] = useState<LocationComparisonResult | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(true);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [addQuery, setAddQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);

  const locationsToCompare = useMemo(() => {
    const unique: GeoLocation[] = [];
    for (const item of [currentLocation, ...savedLocations]) {
      if (!unique.some((u) => isSameGeoLocation(u, item))) {
        unique.push(item);
      }
      if (unique.length >= 4) break;
    }
    if (unique.length < 2 && PRESET_CITIES[1]) {
      unique.push(PRESET_CITIES[1]);
    }
    return unique;
  }, [currentLocation, savedLocations]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function runComparison() {
      if (locationsToCompare.length < 2) return;
      setLoadingCompare(true);
      setCompareError(null);
      try {
        const data = await postApiJson<CompareRequestPayload, LocationComparisonResult>(
          '/api/compare',
          {
            locations: locationsToCompare.map((l) => ({
              name: l.name,
              lat: l.latitude,
              lon: l.longitude,
              timezone: l.timezone || 'auto',
            })),
            language,
          },
          controller.signal
        );
        if (active) setComparison(data);
      } catch (err: unknown) {
        if (!active || (err instanceof Error && err.name === 'AbortError')) return;
        setCompareError(err instanceof Error ? err.message : 'Network error comparing locations.');
      } finally {
        if (active) setLoadingCompare(false);
      }
    }

    runComparison();
    return () => {
      active = false;
      controller.abort();
    };
  }, [locationsToCompare, language, retryTick]);

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addQuery.trim().length < 2) return;
    try {
      const results = await fetchApiJson<GeoLocation[]>(
        `/api/location?q=${encodeURIComponent(addQuery.trim())}`
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t.explore.title}
        </h1>
        <p className="text-xs text-slate-600">{t.explore.subtitle}</p>
      </div>

      <ExploreCityBar
        addQuery={addQuery}
        searchResults={searchResults}
        savedLocations={savedLocations}
        t={t}
        onQueryChange={setAddQuery}
        onSearchSubmit={handleCitySearch}
        onAddCity={(city) => {
          addSavedLocation(city);
          setSearchResults([]);
          setAddQuery('');
        }}
        onSelectCity={selectLocation}
        onRemoveCity={removeSavedLocation}
      />

      {loadingCompare && <LoadingStateCard title={t.common.loading} />}

      {!loadingCompare && compareError && (
        <ErrorStateCard
          title={t.explore.comparisonUnavailable}
          message={compareError}
          retryLabel={t.common.retry}
          onRetry={() => setRetryTick((n) => n + 1)}
        />
      )}

      {!loadingCompare && comparison && (
        <>
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-9 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">{t.explore.mapTitle}</h2>
                <span className="text-[11px] text-slate-600">{t.explore.coverageNote}</span>
              </div>

              <DynamicPollutionMap
                locations={comparison.locations}
                selectedName={currentLocation.name}
                onSelectLocation={(item) => selectLocation(item.location)}
              />
            </div>

            <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">{t.explore.legendTitle}</h2>
              <div className="space-y-2 text-xs">
                {CPCB_CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="p-2 rounded-xl border border-slate-100 flex items-center justify-between gap-2"
                  >
                    <AqiCategoryBadge
                      categoryKey={cat.key}
                      localizedLabel={t.categories[cat.key]}
                    />
                    <span className="font-mono text-[11px] text-slate-700">
                      {cat.aqiLow}–{cat.aqiHigh}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                {t.explore.tilesAttribution}
              </p>
            </div>
          </section>

          <ComparisonTable comparison={comparison} t={t} onSelectLocation={selectLocation} />
        </>
      )}
    </div>
  );
}
