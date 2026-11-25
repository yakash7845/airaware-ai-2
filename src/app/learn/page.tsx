'use client';

import { useMemo, useState } from 'react';
import { computeCpcbNaqi, POLLUTANT_SPECS } from '@/domain/aqi';
import { FAQ_ITEMS, GLOSSARY_ITEMS, LEARNING_TOPICS } from '@/domain/pollutants/learningContent';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { CorePollutantId } from '@/types';
import { AqiCategoryBadge } from '@/components/ui/AqiCategoryBadge';

export default function EnvironmentalLearningPage() {
  const { language, t } = useEnvironment();
  const [tab, setTab] = useState<'topics' | 'calculator' | 'glossary' | 'faq'>('topics');

  const [sandboxVals, setSandboxVals] = useState<Record<CorePollutantId, number>>({
    pm2_5: 55,
    pm10: 95,
    no2: 35,
    so2: 18,
    o3: 80,
    co: 1.1,
  });

  const sandboxResult = useMemo(() => {
    return computeCpcbNaqi(
      (Object.keys(sandboxVals) as CorePollutantId[]).map((pol) => ({
        pollutant: pol,
        value: sandboxVals[pol],
        unit: POLLUTANT_SPECS[pol].standardUnit,
        hoursSampled: POLLUTANT_SPECS[pol].hoursRequired,
        hoursRequired: POLLUTANT_SPECS[pol].hoursRequired,
      })),
      {
        sourceName: 'Interactive Educational Sandbox',
        isRollingWindowAligned: true,
      }
    );
  }, [sandboxVals]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t.learn.title}
        </h1>
        <p className="text-xs text-slate-600">{t.learn.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap rounded-xl p-1 bg-white border border-slate-200 gap-1">
        {(
          [
            { id: 'topics', label: t.learn.topicsTab },
            { id: 'calculator', label: t.learn.calculatorTab },
            { id: 'glossary', label: t.learn.glossaryTab },
            { id: 'faq', label: t.learn.faqTab },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === item.id ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'topics' && (
        <div className="space-y-5">
          {/* Interactive Visual Size Comparison Diagram */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">{t.learn.particleScaleTitle}</h2>
            <svg
              viewBox="0 0 640 130"
              role="img"
              aria-label="Scale comparison showing a 70 micrometer human hair next to a 10 micrometer PM10 particle and a 2.5 micrometer PM2.5 particle"
              className="w-full max-w-2xl h-32"
            >
              <circle cx="95" cy="65" r="52" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
              <text x="95" y="68" textAnchor="middle" className="fill-slate-900 text-xs font-bold">
                Hair ~70 µm
              </text>

              <circle cx="320" cy="65" r="18" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" />
              <text
                x="320"
                y="108"
                textAnchor="middle"
                className="fill-slate-900 text-xs font-bold"
              >
                PM₁₀ (≤10 µm)
              </text>

              <circle cx="515" cy="65" r="6" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
              <text
                x="515"
                y="108"
                textAnchor="middle"
                className="fill-slate-900 text-xs font-bold"
              >
                PM₂.₅ (≤2.5 µm)
              </text>
            </svg>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEARNING_TOPICS.map((topic) => (
              <article
                key={topic.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 text-xs"
              >
                <h2 className="text-sm font-bold text-slate-900">{topic.title[language]}</h2>
                <p className="text-slate-700 leading-relaxed">{topic.summary[language]}</p>
                <ul className="list-disc pl-5 text-slate-600 space-y-1">
                  {topic.keyPoints[language].map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  Reference: {topic.reference}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'calculator' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t.learn.calcTitle}</h2>
            <p className="text-slate-600">{t.learn.calcSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                { id: 'pm2_5', min: 0, max: 350, step: 1 },
                { id: 'pm10', min: 0, max: 500, step: 1 },
                { id: 'o3', min: 0, max: 400, step: 1 },
                { id: 'no2', min: 0, max: 450, step: 1 },
                { id: 'so2', min: 0, max: 1000, step: 5 },
                { id: 'co', min: 0, max: 35, step: 0.1 },
              ] as const
            ).map((cfg) => {
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
                      setSandboxVals((prev) => ({
                        ...prev,
                        [cfg.id]: Number(e.target.value),
                      }))
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
                Dominant Pollutant:{' '}
                <strong>
                  {sandboxResult.dominantPollutant
                    ? POLLUTANT_SPECS[sandboxResult.dominantPollutant].formula
                    : '--'}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-slate-900">
                {sandboxResult.value ?? '--'}
              </span>
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
      )}

      {tab === 'glossary' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {GLOSSARY_ITEMS.map((item) => (
            <div
              key={item.term}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1"
            >
              <h2 className="font-bold text-slate-900 text-sm">{item.term}</h2>
              <p className="text-slate-700 leading-relaxed">{item.definition}</p>
            </div>
          ))}
        </section>
      )}

      {tab === 'faq' && (
        <section className="space-y-3 text-xs">
          {FAQ_ITEMS.map((item) => (
            <article
              key={item.q}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5"
            >
              <h2 className="font-bold text-slate-900 text-sm">{item.q}</h2>
              <p className="text-slate-700 leading-relaxed">{item.a}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
