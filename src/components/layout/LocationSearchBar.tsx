'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, RefreshCw, Search } from 'lucide-react';
import { PRESET_CITIES } from '@/lib/configuration/presets';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ApiResponse, GeoLocation } from '@/types';

export function LocationSearchBar() {
  const {
    currentLocation,
    selectLocation,
    refreshSnapshot,
    isRefreshing,
    requestBrowserGeolocation,
    geolocationStatus,
    t,
  } = useEnvironment();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/location?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as ApiResponse<GeoLocation[]>;
        if (json.success && Array.isArray(json.data)) {
          setResults(json.data);
          setActiveIndex(json.data.length > 0 ? 0 : -1);
          setIsOpen(true);
        } else {
          setResults([]);
          setSearchError(json.error?.message ?? 'Search failed');
          setIsOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setSearchError('Unable to reach geocoding service.');
        setResults([]);
        setIsOpen(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pickLocation = (loc: GeoLocation) => {
    selectLocation(loc);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      pickLocation(results[activeIndex]!);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const activeDescendantId =
    isOpen && activeIndex >= 0 && results[activeIndex]
      ? `geo-option-${results[activeIndex]!.id}-${activeIndex}`
      : undefined;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 shrink-0">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-slate-900 truncate">
                {currentLocation.name}
              </span>
              {currentLocation.countryCode && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {currentLocation.countryCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 truncate">
              {currentLocation.admin1 ? `${currentLocation.admin1}, ` : ''}
              {currentLocation.country} • {currentLocation.latitude.toFixed(2)}°,{' '}
              {currentLocation.longitude.toFixed(2)}° ({currentLocation.timezone})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72" ref={containerRef}>
            <Search
              className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              role="combobox"
              aria-label={t.common.searchPlaceholder}
              aria-expanded={isOpen}
              aria-controls="location-search-listbox"
              aria-autocomplete="list"
              aria-activedescendant={activeDescendantId}
              placeholder={t.common.searchPlaceholder}
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (val.trim().length < 2) {
                  setResults([]);
                  setIsOpen(false);
                  setActiveIndex(-1);
                }
              }}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-teal-700"
            />
            {isSearching && (
              <RefreshCw
                className="w-3.5 h-3.5 animate-spin text-slate-500 absolute right-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            )}

            {isOpen && (
              <div
                id="location-search-listbox"
                role="listbox"
                aria-label="Matching locations"
                className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
              >
                {results.length > 0 ? (
                  results.map((loc, idx) => (
                    <button
                      id={`geo-option-${loc.id}-${idx}`}
                      key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                      type="button"
                      role="option"
                      aria-selected={idx === activeIndex}
                      onClick={() => pickLocation(loc)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 last:border-0 text-xs cursor-pointer ${
                        idx === activeIndex
                          ? 'bg-teal-50 text-teal-950'
                          : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold truncate">{loc.name}</p>
                        <p className="text-[11px] text-slate-600 truncate">
                          {loc.admin1 ? `${loc.admin1}, ` : ''}
                          {loc.country}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 shrink-0">
                        {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-600 text-center">
                    {searchError ?? 'No matching cities found.'}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={requestBrowserGeolocation}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>{t.common.useGeolocation}</span>
          </button>

          <button
            type="button"
            onClick={refreshSnapshot}
            disabled={isRefreshing}
            aria-label={t.common.refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? t.common.refreshing : t.common.refresh}</span>
          </button>
        </div>
      </div>

      {geolocationStatus && (
        <p
          role="status"
          className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"
        >
          {geolocationStatus}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
        <span className="text-[11px] font-semibold text-slate-600 mr-1">
          {t.common.quickCities}:
        </span>
        {PRESET_CITIES.map((city) => {
          const selected = city.name.toLowerCase() === currentLocation.name.toLowerCase();
          return (
            <button
              key={city.id}
              type="button"
              aria-pressed={selected}
              onClick={() => pickLocation(city)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selected
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
