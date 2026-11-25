'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AppTranslations } from '@/i18n';
import { GeoLocation } from '@/types';

interface ExploreCityBarProps {
  addQuery: string;
  searchResults: readonly GeoLocation[];
  savedLocations: readonly GeoLocation[];
  t: AppTranslations;
  onQueryChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onAddCity: (loc: GeoLocation) => void;
  onSelectCity: (loc: GeoLocation) => void;
  onRemoveCity: (id: number, name: string) => void;
}

/** City search input and saved comparison chip bar for the Explore Map view. */
export function ExploreCityBar({
  addQuery,
  searchResults,
  savedLocations,
  t,
  onQueryChange,
  onSearchSubmit,
  onAddCity,
  onSelectCity,
  onRemoveCity,
}: ExploreCityBarProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <label htmlFor="explore-city-search" className="sr-only">
            {t.explore.addCityPlaceholder}
          </label>
          <input
            id="explore-city-search"
            type="text"
            value={addQuery}
            onChange={(e) => onQueryChange(e.target.value)}
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
                onClick={() => onSelectCity(loc)}
                className="hover:underline cursor-pointer"
              >
                {loc.name}
              </button>
              {savedLocations.length > 1 && (
                <button
                  type="button"
                  aria-label={`${t.common.delete} ${loc.name}`}
                  onClick={() => onRemoveCity(loc.id, loc.name)}
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
              onClick={() => onAddCity(r)}
              className="px-2.5 py-1 rounded-lg border border-teal-300 bg-teal-50 text-teal-900 text-xs font-semibold cursor-pointer"
            >
              + {r.name} ({r.countryCode})
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
