'use client';

import React from 'react';
import { AlertCircle, Clock, Inbox, RefreshCw } from 'lucide-react';
import { FreshnessStatus } from '@/types';

export function LoadingStateCard({ title, description }: { title: string; description?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs"
    >
      <div className="inline-flex p-3 rounded-xl bg-teal-50 text-teal-700">
        <RefreshCw className="w-6 h-6 animate-spin" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="text-xs text-slate-600 max-w-md mx-auto">{description}</p>}
    </div>
  );
}

export function ErrorStateCard({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3"
    >
      <div className="inline-flex p-3 rounded-xl bg-rose-100 text-rose-700">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-bold text-rose-950">{title}</h3>
      <p className="text-xs text-rose-900 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyStateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2.5">
      <div className="inline-flex p-3 rounded-xl bg-slate-100 text-slate-600">
        <Inbox className="w-5 h-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-600 max-w-md mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function FreshnessPill({
  status,
  age,
  label,
}: {
  status: FreshnessStatus;
  age: string;
  label?: string;
}) {
  const styles: Record<FreshnessStatus, string> = {
    FRESH: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    STALE: 'bg-amber-50 text-amber-950 border-amber-300',
    EXPIRED: 'bg-rose-50 text-rose-950 border-rose-300',
    UNAVAILABLE: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${styles[status]}`}
    >
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      <span>
        {label ? `${label}: ` : ''}
        {status} ({age})
      </span>
    </span>
  );
}
