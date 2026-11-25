'use client';

import { useState } from 'react';
import { HourlySlot, Language } from '@/types';
import { getTranslations } from '@/i18n';
import { formatLocalHourLabel } from '@/lib/time/timezone';

export function HourlyTrendChart({
  slots,
  language,
  title,
  subtitle,
  onSelectSlot,
}: {
  slots: readonly HourlySlot[];
  language: Language;
  title: string;
  subtitle?: string;
  onSelectSlot?: (slot: HourlySlot) => void;
}) {
  const t = getTranslations(language);
  const [showTable, setShowTable] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (slots.length === 0) return null;

  const width = 760;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const aqiValues = slots.map((s) => s.computedAqi?.value ?? null);
  const numericAqis = aqiValues.filter((v): v is number => v !== null);
  const maxVal = Math.max(120, ...(numericAqis.length > 0 ? numericAqis : [100]));

  const points = slots.map((slot, idx) => {
    const x = slots.length > 1 ? padX + (idx / (slots.length - 1)) * innerW : padX + innerW / 2;
    const val = slot.computedAqi?.value ?? null;
    const y = val !== null ? padY + innerH - (val / maxVal) * innerH : null;
    return { x, y, val, slot, idx };
  });

  const validPoints = points.filter(
    (p): p is typeof p & { y: number; val: number } => p.y !== null
  );
  const polylinePoints = validPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const firstForecastIdx = slots.findIndex((s) => s.isForecast);
  const forecastDividerX =
    firstForecastIdx > 0 && slots.length > 1
      ? padX + (firstForecastIdx / (slots.length - 1)) * innerW
      : null;

  const selectedPoint = selectedIdx !== null ? points[selectedIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          aria-pressed={showTable}
          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer"
        >
          {showTable ? t.common.viewChart : t.common.viewTable}
        </button>
      </div>

      {!showTable ? (
        <div className="space-y-3">
          <div
            tabIndex={0}
            role="region"
            aria-label={`${title} chart viewport`}
            className="overflow-x-auto rounded-xl focus-visible:outline-2"
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${title}: Hourly indicative CPCB NAQI trend chart across ${slots.length} hours`}
              className="w-full min-w-[560px] h-52"
            >
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const y = padY + innerH * (1 - frac);
                const labelVal = Math.round(maxVal * frac);
                return (
                  <g key={frac}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={width - padX}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px]"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Past vs Forecast boundary line */}
              {forecastDividerX !== null && (
                <g>
                  <line
                    x1={forecastDividerX}
                    y1={padY}
                    x2={forecastDividerX}
                    y2={height - padY}
                    stroke="#0f766e"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={forecastDividerX + 4}
                    y={padY + 10}
                    className="fill-teal-800 text-[10px] font-semibold"
                  >
                    {t.common.forecastBadge} →
                  </text>
                </g>
              )}

              {validPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {validPoints.map((p) => {
                const isSelected = selectedIdx === p.idx;
                return (
                  <g key={p.idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 5.5 : 3.2}
                      fill={p.slot.isForecast ? '#0284c7' : '#0f766e'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedIdx(p.idx);
                        onSelectSlot?.(p.slot);
                      }}
                    />
                  </g>
                );
              })}

              {/* X-axis sparse labels */}
              {points
                .filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0)
                .map((p) => {
                  const lbl = formatLocalHourLabel(p.slot.localTime);
                  return (
                    <text
                      key={p.idx}
                      x={p.x}
                      y={height - 6}
                      textAnchor="middle"
                      className="fill-slate-600 text-[10px]"
                    >
                      {lbl.shortTime}
                    </text>
                  );
                })}
            </svg>
          </div>

          {selectedPoint && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">
                {selectedPoint.slot.localTime.replace('T', ' ')} (
                {selectedPoint.slot.isForecast ? t.common.forecastBadge : t.common.pastModelled})
              </span>
              <span className="font-mono text-slate-800">
                IN NAQI: {selectedPoint.val ?? '--'} • PM₂.₅:{' '}
                {selectedPoint.slot.measurements.find((m) => m.pollutant === 'pm2_5')?.value ??
                  '--'}{' '}
                µg/m³ • O₃:{' '}
                {selectedPoint.slot.measurements.find((m) => m.pollutant === 'o3')?.value ?? '--'}{' '}
                µg/m³
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label={`${title} data table`}
          className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-white border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3 font-semibold">Time</th>
                <th className="py-2 pr-3 font-semibold">Kind</th>
                <th className="py-2 pr-3 font-semibold">Indicative NAQI</th>
                <th className="py-2 pr-3 font-semibold">PM₂.₅ (µg/m³)</th>
                <th className="py-2 pr-3 font-semibold">PM₁₀ (µg/m³)</th>
                <th className="py-2 font-semibold">Temp (°C)</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, idx) => (
                <tr
                  key={`${slot.time}-${idx}`}
                  onClick={() => {
                    setSelectedIdx(idx);
                    onSelectSlot?.(slot);
                  }}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-1.5 pr-3 font-mono text-slate-800">
                    {slot.localTime.replace('T', ' ')}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-600">
                    {slot.isForecast ? t.common.forecastBadge : t.common.pastModelled}
                  </td>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">
                    {slot.computedAqi?.value ?? '--'}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-slate-700">
                    {slot.measurements.find((m) => m.pollutant === 'pm2_5')?.value ?? '--'}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-slate-700">
                    {slot.measurements.find((m) => m.pollutant === 'pm10')?.value ?? '--'}
                  </td>
                  <td className="py-1.5 font-mono text-slate-700">
                    {slot.weather?.temperature ?? '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
