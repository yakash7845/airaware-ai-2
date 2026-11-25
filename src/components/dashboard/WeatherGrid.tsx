'use client';

import { CloudRain, Compass, Droplets, Eye, Gauge, Sun, Thermometer, Wind } from 'lucide-react';
import { Language, WeatherData } from '@/types';
import { getTranslations } from '@/i18n';

function cardinalDirection(deg: number): string {
  const dirs = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  return dirs[Math.round(deg / 22.5) % 16] ?? 'N';
}

export function WeatherGrid({
  weather,
  language,
  compact = false,
}: {
  weather: WeatherData | null;
  language: Language;
  compact?: boolean;
}) {
  const t = getTranslations(language);

  if (!weather) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-600">
        {t.weatherLabels.title}: {t.common.unavailable}
      </div>
    );
  }

  const cards = [
    {
      label: t.weatherLabels.conditions,
      value: t.weatherConditions[weather.weatherCondition],
      sub:
        weather.apparentTemperature !== null && weather.apparentTemperature !== undefined
          ? `${t.weatherLabels.feelsLike}: ${weather.apparentTemperature.toFixed(1)}°C`
          : undefined,
      icon: Sun,
    },
    {
      label: t.weatherLabels.temperature,
      value: `${weather.temperature}°C`,
      icon: Thermometer,
    },
    {
      label: t.weatherLabels.humidity,
      value: `${weather.humidity}%`,
      icon: Droplets,
    },
    {
      label: t.weatherLabels.windSpeed,
      value: `${weather.windSpeed} km/h`,
      sub: `${cardinalDirection(weather.windDirection)} (${weather.windDirection}°)`,
      icon: Wind,
    },
    {
      label: t.weatherLabels.precipitation,
      value: `${weather.precipitation} mm`,
      icon: CloudRain,
    },
    ...(!compact
      ? [
          {
            label: t.weatherLabels.windDirection,
            value: `${cardinalDirection(weather.windDirection)} · ${weather.windDirection}°`,
            icon: Compass,
          },
          {
            label: t.weatherLabels.pressure,
            value:
              weather.surfacePressure !== null && weather.surfacePressure !== undefined
                ? `${Math.round(weather.surfacePressure)} hPa`
                : t.common.unavailable,
            icon: Gauge,
          },
          {
            label: t.weatherLabels.visibility,
            value:
              weather.visibilityMeters !== null && weather.visibilityMeters !== undefined
                ? `${(weather.visibilityMeters / 1000).toFixed(1)} km`
                : t.common.unavailable,
            icon: Eye,
          },
        ]
      : []),
  ];

  return (
    <section aria-label={t.weatherLabels.title} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">{t.weatherLabels.title}</h2>
        <span className="text-[11px] text-slate-600">{weather.attribution}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3"
            >
              <div className="p-2 rounded-xl bg-slate-100 text-teal-700 shrink-0">
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-600 truncate">{c.label}</p>
                <p className="text-base font-bold text-slate-900 truncate">{c.value}</p>
                {c.sub && <p className="text-[11px] text-slate-600 truncate">{c.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
