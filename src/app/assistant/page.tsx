'use client';

import { useState } from 'react';
import { RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react';
import { PRESET_CITIES } from '@/lib/configuration/presets';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ApiResponse, ChatMessage, Language } from '@/types';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

const SUGGESTED_PROMPTS: Record<Language, string[]> = {
  en: [
    'What is the current AQI in my location and why is it at this level?',
    'Explain PM2.5 in simple language.',
    'Compare my location with Coimbatore.',
    'What does the 24-hour forecast indicate?',
    'Explain the difference between observed and modelled pollution data.',
    'Summarize conditions and practical steps for my household.',
  ],
  ta: [
    'என் இடத்தின் இன்றைய AQI மற்றும் முக்கிய மாசு என்ன?',
    'PM2.5 என்றால் என்ன? எளிய தமிழில் விளக்குங்கள்.',
    'அடுத்த 24 மணி நேர முன்னறிவிப்பு என்ன சொல்கிறது?',
    'நேரடி சென்சார் தரவிற்கும் மாதிரி தரவிற்கும் என்ன வித்தியாசம்?',
  ],
  hi: [
    'मेरे स्थान का वर्तमान AQI क्या है और इसका मुख्य कारण क्या है?',
    'PM2.5 को सरल शब्दों में समझाएं।',
    'आगामी 24 घंटे का पूर्वानुमान क्या दर्शाता है?',
    'मेरे परिवार के लिए आज के व्यावहारिक सुझाव बताएं।',
  ],
};

export default function AssistantPage() {
  const {
    snapshot,
    isLoading,
    error,
    refreshSnapshot,
    currentLocation,
    activeProfile,
    language,
    t,
  } = useEnvironment();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [compareCityName, setCompareCityName] = useState<string>('Coimbatore');

  if (isLoading) {
    return <LoadingStateCard title={t.common.loading} description={t.common.loadingDesc} />;
  }

  if (error || !snapshot) {
    return (
      <ErrorStateCard
        title="Unable to Initialize AI Assistant"
        message={error ?? 'Environmental context unavailable.'}
        retryLabel={t.common.retry}
        onRetry={refreshSnapshot}
      />
    );
  }

  const sendMessage = async (questionText: string, baseHistory: ChatMessage[] = messages) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      profileCategory: activeProfile.category,
      language,
    };

    setMessages([...baseHistory, userMsg]);
    setInput('');
    setChatError(null);
    setIsSending(true);

    const compareCity = PRESET_CITIES.find(
      (c) =>
        c.name.toLowerCase() === compareCityName.toLowerCase() &&
        c.name.toLowerCase() !== currentLocation.name.toLowerCase()
    );

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          lat: currentLocation.latitude,
          lon: currentLocation.longitude,
          locationName: currentLocation.name,
          timezone: currentLocation.timezone || 'auto',
          compareLocations: compareCity
            ? [
                {
                  name: compareCity.name,
                  lat: compareCity.latitude,
                  lon: compareCity.longitude,
                  timezone: compareCity.timezone,
                },
              ]
            : [],
          profileCategory: activeProfile.category,
          language,
          history: baseHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = (await res.json()) as ApiResponse<ChatMessage>;
      if (json.success && json.data) {
        setMessages((prev) => [...prev, json.data!]);
      } else {
        setChatError(json.error?.message ?? 'Assistant request failed.');
      }
    } catch {
      setChatError('Network error contacting assistant endpoint.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUser = messages[actualIdx];
    if (!lastUser) return;
    sendMessage(lastUser.content, messages.slice(0, actualIdx));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.assistant.title}
          </h1>
          <p className="text-xs text-slate-600">{t.assistant.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isSending || !messages.some((m) => m.role === 'user')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.assistant.regenerateBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setChatError(null);
            }}
            disabled={messages.length === 0 || isSending}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.assistant.clearBtn}</span>
          </button>
        </div>
      </div>

      {/* Context Controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-900 font-semibold">
            {currentLocation.name}: {snapshot.computedAqi.value ?? '--'} IN NAQI
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold">
            {activeProfile.name} ({activeProfile.category})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="assistant-compare-city" className="text-slate-600 font-medium">
            {t.assistant.compareWithLabel}:
          </label>
          <select
            id="assistant-compare-city"
            value={compareCityName}
            onChange={(e) => setCompareCityName(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-900"
          >
            <option value="">None</option>
            {PRESET_CITIES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Suggested Prompts */}
      <section className="space-y-2">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
          <span>{t.assistant.suggestedTitle}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS[language].map((q) => (
            <button
              key={q}
              type="button"
              disabled={isSending}
              onClick={() => sendMessage(q)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-teal-600 text-xs text-slate-800 text-left disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Conversation Log */}
      <section
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-label="Assistant conversation log"
        className="bg-white border border-slate-200 rounded-2xl p-4 min-h-[300px] max-h-[540px] overflow-y-auto space-y-4"
      >
        {messages.length === 0 ? (
          <div className="py-14 text-center space-y-1.5 text-xs text-slate-600">
            <p className="font-bold text-slate-900 text-sm">{t.assistant.emptyTitle}</p>
            <p className="max-w-lg mx-auto">{t.assistant.emptySubtitle}</p>
          </div>
        ) : (
          messages.map((m) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-teal-700 text-white text-xs">
                    {m.content}
                  </div>
                </div>
              );
            }

            const s = m.structured;
            return (
              <div key={m.id} className="flex justify-start">
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
                      {s?.engineMode === 'GEMINI_GROUNDED'
                        ? t.assistant.modeAi
                        : t.assistant.modeFallback}
                    </span>
                  </div>

                  <p className="text-slate-900 leading-relaxed">{m.content}</p>

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
                          onClick={() => sendMessage(fq)}
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
          })
        )}
        {isSending && (
          <p role="status" className="text-xs text-teal-800 font-semibold">
            Generating grounded environmental explanation...
          </p>
        )}
      </section>

      {chatError && (
        <p
          role="alert"
          className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3"
        >
          {chatError}
        </p>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor="assistant-question-input" className="sr-only">
          {t.assistant.placeholder}
        </label>
        <input
          id="assistant-question-input"
          type="text"
          maxLength={800}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.assistant.placeholder}
          disabled={isSending}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.assistant.sendBtn}</span>
        </button>
      </form>
    </div>
  );
}
