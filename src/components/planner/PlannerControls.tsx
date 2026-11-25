'use client';

import { AppTranslations } from '@/i18n';
import { ActivityType, TimeWindowPreference } from '@/types';

const ACTIVITIES: readonly ActivityType[] = [
  'WALKING',
  'CYCLING',
  'RUNNING',
  'OUTDOOR_SPORTS',
  'SCHOOL_COMMUTE',
  'OUTDOOR_RECREATION',
];

const TIME_PREFS: readonly TimeWindowPreference[] = ['ANY', 'MORNING', 'MIDDAY', 'EVENING'];

interface PlannerControlsProps {
  activity: ActivityType;
  effectiveDate: string;
  availableDates: readonly string[];
  timePreference: TimeWindowPreference;
  profileLabel: string;
  t: AppTranslations;
  onActivityChange: (act: ActivityType) => void;
  onDateChange: (date: string) => void;
  onTimePreferenceChange: (pref: TimeWindowPreference) => void;
}

/** Control panel for selecting activity, date, and time preference in Outdoor Planner. */
export function PlannerControls({
  activity,
  effectiveDate,
  availableDates,
  timePreference,
  profileLabel,
  t,
  onActivityChange,
  onDateChange,
  onTimePreferenceChange,
}: PlannerControlsProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
      <div className="space-y-2">
        <span className="font-bold text-slate-800 block">{t.planner.activityLabel}</span>
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((act) => (
            <button
              key={act}
              type="button"
              aria-pressed={activity === act}
              onClick={() => onActivityChange(act)}
              className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${
                activity === act
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {t.planner.activities[act]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label htmlFor="planner-date" className="block font-semibold text-slate-800 mb-1">
            {t.planner.dateLabel}
          </label>
          <select
            id="planner-date"
            value={effectiveDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="planner-pref" className="block font-semibold text-slate-800 mb-1">
            {t.planner.timePrefLabel}
          </label>
          <select
            id="planner-pref"
            value={timePreference}
            onChange={(e) => onTimePreferenceChange(e.target.value as TimeWindowPreference)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
          >
            {TIME_PREFS.map((p) => (
              <option key={p} value={p}>
                {t.planner.timePrefs[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="font-semibold text-slate-800 mb-1">{t.planner.profileLabel}</p>
          <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900">
            {profileLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
