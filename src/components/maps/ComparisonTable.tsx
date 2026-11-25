'use client';

import { POLLUTANT_SPECS } from '@/domain/aqi';
import { AppTranslations } from '@/i18n';
import { GeoLocation, LocationComparisonResult } from '@/types';
import { AqiCategoryBadge } from '@/components/ui/AqiCategoryBadge';

interface ComparisonTableProps {
  comparison: LocationComparisonResult;
  t: AppTranslations;
  onSelectLocation: (loc: GeoLocation) => void;
}

/** Accessible side-by-side multi-city air quality & meteorological comparison table. */
export function ComparisonTable({ comparison, t, onSelectLocation }: ComparisonTableProps) {
  const h = t.explore.tableHeaders;

  return (
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
        aria-label={t.explore.tableAriaLabel}
        className="overflow-x-auto"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="py-2 pr-3 font-semibold">{h.city}</th>
              <th className="py-2 pr-3 font-semibold">{h.indicativeNaqi}</th>
              <th className="py-2 pr-3 font-semibold">{h.category}</th>
              <th className="py-2 pr-3 font-semibold">{h.dominant}</th>
              <th className="py-2 pr-3 font-semibold">{h.pm25}</th>
              <th className="py-2 pr-3 font-semibold">{h.pm10}</th>
              <th className="py-2 pr-3 font-semibold">{h.weather}</th>
              <th className="py-2 pr-3 font-semibold">{h.trend}</th>
              <th className="py-2 font-semibold">{h.freshness}</th>
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
                    onClick={() => onSelectLocation(item.location)}
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
  );
}
