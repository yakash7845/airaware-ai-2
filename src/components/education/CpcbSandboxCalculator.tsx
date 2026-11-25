'use client';

import { useMemo, useState } from 'react';
import { computeCpcbNaqi, POLLUTANT_SPECS } from '@/domain/aqi';
import { AppTranslations } from '@/i18n';
import { CorePollutantId } from '@/types';
import { AqiCategoryBadge } from '@/components/ui/AqiCategoryBadge';

const SLIDER_CONFIG: ReadonlyArray<{
  id: CorePollutantId;
  min: number;
  max: number;
  step: number;
}> = [
  { id: 'pm2_5', min: 0, max: 350, step: 1 },
  { id: 'pm10', min: 0, max: 500, step: 1 },
  { id: 'o3', min: 0, max: 400, step: 1 },
  { id: 'no2', min: 0, max: 450, step: 1 },
  { id: 'so2', min: 0, max: 1000, step: 5 },
  { id: 'co', min: 0, max: 35, step: 0.1 },
];

/** Interactive CPCB 2014 NAQI piecewise interpolation sandbox for education. */
export function CpcbSandboxCalculator({ t }: { t: AppTranslations }) {
  const [sandboxVals, setSandboxVals] = useState<Record<CorePollutantId, number>>({
    pm2_5: 55,
    pm10: 95,
    no2: 35,
    so2: 18,
    o3: 80,
    co: 1.1,
  });

  const sandboxResult = useMemo(
    () =>
      computeCpcbNaqi(
        (Object.keys(sandboxVals) as CorePollutantId[]).map((pol) => ({
          pollutant: pol,
          value: sandboxVals[pol],
          unit: POLLUTANT_SPECS[pol].standardUnit,
          hoursSampled: POLLUTANT_SPECS[pol].hoursRequired,
          hoursRequired: POLLUTANT_SPECS[pol].hoursRequired,
        })),
        { sourceName: 'Interactive Educational Sandbox', isRollingWindowAligned: true }
      ),
    [sandboxVals]
  );

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 text-xs">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{t.learn.calcTitle}</h2>
        <p className="text-slate-600">{t.learn.calcSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SLIDER_CONFIG.map((cfg) => {
          const spec = POLLUTANT_SPECS[cfg.id];
          return (
            <div
              key={cfg.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <label htmlFor={`sandbox-${cfg.id}`} className="font-bold text-slate-900">
                  {spec.formula} ({spec.averagingPeriod})
                </label>
                <span className="font-mono font-bold text-teal-900">
                  {sandboxVals[cfg.id]} {spec.standardUnit} → Sub{' '}
                  {sandboxResult.subIndices[cfg.id] ?? '--'}
                </span>
              </div>
              <input
                id={`sandbox-${cfg.id}`}
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={sandboxVals[cfg.id]}
                onChange={(e) =>
                  setSandboxVals((prev) => ({ ...prev, [cfg.id]: Number(e.target.value) }))
                }
                className="w-full accent-teal-700"
              />
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-teal-950">Computed CPCB NAQI = max(Sub-Indices)</p>
          <p className="text-slate-700">
            {t.common.dominantPollutant}:{' '}
            <strong>
              {sandboxResult.dominantPollutant
                ? POLLUTANT_SPECS[sandboxResult.dominantPollutant].formula
                : '--'}
            </strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-slate-900">{sandboxResult.value ?? '--'}</span>
          <AqiCategoryBadge
            categoryKey={sandboxResult.categoryKey}
            localizedLabel={
              sandboxResult.categoryKey ? t.categories[sandboxResult.categoryKey] : undefined
            }
            size="md"
          />
        </div>
      </div>
    </section>
  );
}
