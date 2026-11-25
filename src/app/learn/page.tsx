'use client';

import { useState } from 'react';
import { FAQ_ITEMS, GLOSSARY_ITEMS, LEARNING_TOPICS } from '@/domain/pollutants/learningContent';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { CpcbSandboxCalculator } from '@/components/education/CpcbSandboxCalculator';
import { ParticleScaleDiagram } from '@/components/education/ParticleScaleDiagram';

export default function EnvironmentalLearningPage() {
  const { language, t } = useEnvironment();
  const [tab, setTab] = useState<'topics' | 'calculator' | 'glossary' | 'faq'>('topics');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t.learn.title}
        </h1>
        <p className="text-xs text-slate-600">{t.learn.subtitle}</p>
      </div>

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
          <ParticleScaleDiagram title={t.learn.particleScaleTitle} />

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

      {tab === 'calculator' && <CpcbSandboxCalculator t={t} />}

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
