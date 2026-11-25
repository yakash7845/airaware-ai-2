'use client';

import { DEFAULT_INDOOR_SETUP } from '@/domain/recommendations/indoorAdvisor';
import { AppTranslations } from '@/i18n';
import { IndoorEnvironmentSetup } from '@/types';

interface IndoorSetupFormProps {
  indoorSetup: IndoorEnvironmentSetup;
  t: AppTranslations;
  onChange: (next: IndoorEnvironmentSetup) => void;
}

/** Accessible configuration fieldset grid for voluntary indoor room setup parameters. */
export function IndoorSetupForm({ indoorSetup, t, onChange }: IndoorSetupFormProps) {
  const toggleField = <K extends Exclude<keyof IndoorEnvironmentSetup, 'updatedAt'>>(
    key: K,
    val: NonNullable<IndoorEnvironmentSetup[K]>
  ) => {
    onChange({
      ...indoorSetup,
      [key]: indoorSetup[key] === val ? null : val,
      updatedAt: new Date().toISOString(),
    });
  };

  const renderToggleGroup = <K extends Exclude<keyof IndoorEnvironmentSetup, 'updatedAt'>>(
    key: K,
    label: string,
    options: ReadonlyArray<{ val: NonNullable<IndoorEnvironmentSetup[K]>; text: string }>
  ) => (
    <fieldset className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
      <legend className="text-xs font-bold text-slate-900 px-1">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = indoorSetup[key] === opt.val;
          return (
            <button
              key={opt.val}
              type="button"
              aria-pressed={active}
              onClick={() => toggleField(key, opt.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                active
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const opts = t.indoor.options;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderToggleGroup('naturallyVentilated', t.indoor.qVentilation, [
          { val: 'YES', text: opts.yes },
          { val: 'PARTIAL', text: opts.partial },
          { val: 'NO', text: opts.mechanical },
        ])}
        {renderToggleGroup('windowsStatus', t.indoor.qWindows, [
          { val: 'OPEN', text: opts.open },
          { val: 'TIME_DEPENDENT', text: opts.timed },
          { val: 'CLOSED', text: opts.closed },
        ])}
        {renderToggleGroup('cookingNearby', t.indoor.qCooking, [
          { val: 'YES', text: opts.activeDaily },
          { val: 'OCCASIONALLY', text: opts.occasionally },
          { val: 'NO', text: opts.no },
        ])}
        {renderToggleGroup('visibleDustOrSmoke', t.indoor.qDust, [
          { val: 'YES', text: opts.frequent },
          { val: 'SOMETIMES', text: opts.sometimes },
          { val: 'NO', text: opts.no },
        ])}
        {renderToggleGroup('airPurifierAvailable', t.indoor.qPurifier, [
          { val: 'YES', text: opts.yes },
          { val: 'NO', text: opts.no },
        ])}
        {renderToggleGroup('roadFacingArea', t.indoor.qRoad, [
          { val: 'YES', text: opts.busyRoad },
          { val: 'NO', text: opts.quietCourtyard },
        ])}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_INDOOR_SETUP)}
          className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
        >
          {t.common.clear}
        </button>
      </div>
    </section>
  );
}
