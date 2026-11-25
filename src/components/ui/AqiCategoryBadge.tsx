'use client';

import { AlertTriangle, CheckCircle2, Flame, Info, ShieldAlert } from 'lucide-react';
import { CpcbCategoryKey } from '@/types';
import { getCpcbCategoryByKey } from '@/domain/aqi';

export function AqiCategoryBadge({
  categoryKey,
  localizedLabel,
  size = 'sm',
}: {
  categoryKey: CpcbCategoryKey | null;
  localizedLabel?: string;
  size?: 'sm' | 'md';
}) {
  const spec = getCpcbCategoryByKey(categoryKey);
  if (!spec || !categoryKey) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-300 bg-slate-100 text-slate-800 text-xs font-semibold">
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Unavailable</span>
      </span>
    );
  }

  const Icon =
    categoryKey === 'GOOD'
      ? CheckCircle2
      : categoryKey === 'SATISFACTORY'
        ? Info
        : categoryKey === 'MODERATE'
          ? AlertTriangle
          : categoryKey === 'POOR' || categoryKey === 'VERY_POOR'
            ? ShieldAlert
            : Flame;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${spec.badgeBgClass} ${spec.badgeTextClass} ${spec.badgeBorderClass} ${
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{localizedLabel ?? spec.name}</span>
    </span>
  );
}
