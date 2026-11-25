'use client';

import { ComputedAqi, Language } from '@/types';
import { getTranslations } from '@/i18n';
import { AqiCategoryBadge } from '../ui/AqiCategoryBadge';

export function AqiGauge({
  computedAqi,
  language,
}: {
  computedAqi: ComputedAqi;
  language: Language;
}) {
  const t = getTranslations(language);
  const val = computedAqi.value;
  const clamped = val !== null ? Math.min(500, Math.max(0, val)) : 0;
  const pct = clamped / 500;
  const radius = 78;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const strokeColor = computedAqi.categoryColor ?? '#64748b';
  const catLabel = computedAqi.categoryKey
    ? t.categories[computedAqi.categoryKey]
    : t.common.unavailable;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <svg
        width="200"
        height="120"
        viewBox="0 0 200 120"
        role="img"
        aria-label={`Indicative India CPCB NAQI gauge: ${val ?? 'unavailable'} out of 500, category ${catLabel}`}
        className="overflow-visible"
      >
        <path
          d="M 22 104 A 78 78 0 0 1 178 104"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {val !== null && (
          <path
            d="M 22 104 A 78 78 0 0 1 178 104"
            fill="none"
            stroke={strokeColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        )}
        <text
          x="100"
          y="78"
          textAnchor="middle"
          className="fill-slate-900 font-black"
          style={{ fontSize: '34px' }}
        >
          {val !== null ? val : '--'}
        </text>
        <text
          x="100"
          y="98"
          textAnchor="middle"
          className="fill-slate-600 font-semibold uppercase"
          style={{ fontSize: '10px', letterSpacing: '0.08em' }}
        >
          IN NAQI (0–500)
        </text>
      </svg>

      <div className="mt-1">
        <AqiCategoryBadge
          categoryKey={computedAqi.categoryKey}
          localizedLabel={catLabel}
          size="md"
        />
      </div>
    </div>
  );
}
