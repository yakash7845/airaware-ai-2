'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CPCB_CATEGORIES, POLLUTANT_SPECS } from '@/domain/aqi';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { PRESET_CITIES } from '@/lib/configuration/presets';
import { ApiResponse, GeoLocation, LocationComparisonResult } from '@/types';
import { DynamicPollutionMap } from '@/components/maps/DynamicPollutionMap';
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
  const [addQuery, setAddQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);

  const locationsToCompare = useMemo(() => {
    const merged = [currentLocation, ...savedLocations];
    const unique: GeoLocation[] = [];
    for (const item of merged) {
      if (
        !unique.some(
          (u) =>
            u.name.toLowerCase() === item.name.toLowerCase() &&
            Math.abs(u.latitude - item.latitude) < 0.05
        )
      ) {
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
        const res = await fetch('/api/compare', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locations: locationsToCompare.map((l) => ({
              name: l.name,
              lat: l.latitude,
              lon: l.longitude,
              timezone: l.timezone || 'auto',
            })),
            language,
          }),
        });
        const json = (await res.json()) as ApiResponse<LocationComparisonResult>;
        if (!active) return;
        if (json.success && json.data) {
          setComparison(json.data);
        } else {
          setCompareError(json.error?.message ?? 'Comparison failed');
        }
      } catch (err: unknown) {
        if (!active || (err instanceof Error && err.name === 'AbortError')) return;
        setCompareError('Network error comparing locations.');
      } finally {
        if (active) setLoadingCompare(false);
      }
    }

    runComparison();
    return () => {
      active = false;
      controller.abort();
    };
  }, [locationsToCompare, language]);

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addQuery.trim().length < 2) return;
    const res = await fetch(`/api/location?q=${encodeURIComponent(addQuery.trim())}`);
    const json = (await res.json()) as ApiResponse<GeoLocation[]>;
    if (json.success && json.data) {
      setSearchResults(json.data);
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

      {/* Add city to comparison */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleCitySearch} className="flex items-center gap-2 flex-1 max-w-md">
            <label htmlFor="explore-city-search" className="sr-only">
              {t.explore.addCityPlaceholder}
            </label>
            <input
              id="explore-city-search"
              type="text"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder={t.explore.addCityPlaceholder}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.common.add}</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            {savedLocations.map((loc) => (
              <span
                key={`${loc.id}-${loc.name}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800"
              >
                <button
                  type="button"
                  onClick={() => selectLocation(loc)}
                  className="hover:underline cursor-pointer"
                >
                  {loc.name}
                </button>
                {savedLocations.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${loc.name}`}
                    onClick={() => removeSavedLocation(loc.id, loc.name)}
                    className="text-slate-500 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {searchResults.slice(0, 5).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  addSavedLocation(r);
                  setSearchResults([]);
                  setAddQuery('');
                }}
                className="px-2.5 py-1 rounded-lg border border-teal-300 bg-teal-50 text-teal-900 text-xs font-semibold cursor-pointer"
              >
                + {r.name} ({r.countryCode})
              </button>
            ))}
          </div>
        )}
      </section>

      {loadingCompare && <LoadingStateCard title={t.common.loading} />}

      {!loadingCompare && compareError && (
        <ErrorStateCard
          title="Map Comparison Unavailable"
          message={compareError}
          retryLabel={t.common.retry}
          onRetry={() => selectLocation({ ...currentLocation })}
        />
      )}

      {!loadingCompare && comparison && (
        <>
          {/* Map + Legend */}
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
                Map tiles © OpenStreetMap contributors. Circles visualize regional ~45 km CAMS grid
                cells.
              </p>
            </div>
          </section>

          {/* Location Comparison Table & Summary */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t.explore.compareTitle}</h2>
                <p className="text-xs text-slate-600">{t.explore.compareSubtitle}</p>
              </div>
              {comparison.cleanestLocationName && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                    {t.explore.cleanestLabel}: {comparison.cleanestLocationName}
                  </span>
                </div>
              )}
            </div>

            <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900">
              {comparison.summary}
            </p>

            {comparison.timestampWarning && (
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                {t.explore.timestampWarningPrefix} {comparison.timestampWarning}
              </p>
            )}

            <div
              tabIndex={0}
              role="region"
              aria-label="Location comparison table"
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700">
                    <th className="py-2 pr-3 font-semibold">City</th>
                    <th className="py-2 pr-3 font-semibold">Indicative IN NAQI</th>
                    <th className="py-2 pr-3 font-semibold">Category</th>
                    <th className="py-2 pr-3 font-semibold">Dominant</th>
                    <th className="py-2 pr-3 font-semibold">PM₂.₅ (µg/m³)</th>
                    <th className="py-2 pr-3 font-semibold">PM₁₀ (µg/m³)</th>
                    <th className="py-2 pr-3 font-semibold">Weather</th>
                    <th className="py-2 pr-3 font-semibold">Trend</th>
                    <th className="py-2 font-semibold">Freshness</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.locations.map((item) => (
                    <tr
                      key={`${item.location.name}-${item.location.latitude}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2.5 pr-3 font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => selectLocation(item.location)}
                          className="text-teal-800 hover:underline cursor-pointer"
                        >
                          {item.location.name}
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 font-black text-slate-900">
                        {item.computedAqi.value ?? '--'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <AqiCategoryBadge
                          categoryKey={item.computedAqi.categoryKey}
                          localizedLabel={
                            item.computedAqi.categoryKey
                              ? t.categories[item.computedAqi.categoryKey]
                              : undefined
                          }
                        />
                      </td>
                      <td className="py-2.5 pr-3 font-semibold">
                        {item.computedAqi.dominantPollutant
                          ? POLLUTANT_SPECS[item.computedAqi.dominantPollutant].formula
                          : '--'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">{item.pm25 ?? '--'}</td>
                      <td className="py-2.5 pr-3 font-mono">{item.pm10 ?? '--'}</td>
                      <td className="py-2.5 pr-3">
                        {item.weather
                          ? `${item.weather.temperature}°C, ${item.weather.windSpeed} km/h`
                          : '--'}
                      </td>
                      <td className="py-2.5 pr-3">{item.trendDirection}</td>
                      <td className="py-2.5 font-mono text-[11px]">{item.freshness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
