'use client';

import { AppTranslations } from '@/i18n';
import { ChatMessage } from '@/types';

interface AssistantMessageCardProps {
  message: ChatMessage;
  isSending: boolean;
  t: AppTranslations;
  onFollowUp: (question: string) => void;
}

/** Render a single user or grounded AI assistant message with structured pollutant cards and sources. */
export function AssistantMessageCard({
  message,
  isSending,
  t,
  onFollowUp,
}: AssistantMessageCardProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-teal-700 text-white text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  const s = message.structured;
  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <span className="font-bold text-slate-900">{s?.summary ?? 'Response'}</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              s?.engineMode === 'GEMINI_GROUNDED'
                ? 'bg-sky-100 text-sky-900'
                : 'bg-slate-200 text-slate-800'
            }`}
          >
            {s?.engineMode === 'GEMINI_GROUNDED' ? t.assistant.modeAi : t.assistant.modeFallback}
          </span>
        </div>

        <p className="text-slate-900 leading-relaxed">{message.content}</p>

        {s && s.relevantPollutants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {s.relevantPollutants.map((rp, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200">
                <p className="font-bold text-slate-900">
                  {rp.pollutant}: {rp.value}
                </p>
                <p className="text-[11px] text-slate-600">{rp.interpretation}</p>
              </div>
            ))}
          </div>
        )}

        {s && s.practicalGuidance.length > 0 && (
          <div>
            <p className="font-bold text-slate-900 mb-1">{t.assistant.guidanceLabel}</p>
            <ul className="list-disc pl-5 text-slate-700 space-y-0.5">
              {s.practicalGuidance.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        {s && (
          <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-600">
            <p>
              <strong>{t.assistant.uncertaintyLabel}:</strong> {s.uncertainty}
            </p>
            <p>
              <strong>{t.assistant.sourcesLabel}:</strong> {s.sources.join(' • ')}
            </p>
          </div>
        )}

        {s && s.followUpQuestions.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-1.5">
            {s.followUpQuestions.map((fq) => (
              <button
                key={fq}
                type="button"
                onClick={() => onFollowUp(fq)}
                disabled={isSending}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-teal-600 text-[11px] text-slate-800 cursor-pointer"
              >
                {fq}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
