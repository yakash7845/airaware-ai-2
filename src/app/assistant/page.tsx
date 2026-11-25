'use client';

import { useState } from 'react';
import { RefreshCw, Send, Trash2 } from 'lucide-react';
import { PRESET_CITIES } from '@/lib/configuration/presets';
import { PUBLIC_SECURITY_LIMITS } from '@/lib/configuration/publicConstants';
import { useEnvironment } from '@/hooks/useEnvironmentContext';
import { ChatMessage, ChatRequestPayload } from '@/types';
import { buildLocationRequestBase, postApiJson } from '@/utils/apiClient';
import { AssistantControls } from '@/components/assistant/AssistantControls';
import { AssistantMessageCard } from '@/components/assistant/AssistantMessageCard';
import { ErrorStateCard, LoadingStateCard } from '@/components/ui/StateCards';

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
        title={t.common.errorTitle}
        message={error ?? t.common.unavailable}
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
      const reply = await postApiJson<ChatRequestPayload, ChatMessage>('/api/chat', {
        message: trimmed,
        ...buildLocationRequestBase(currentLocation),
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
      });
      setMessages((prev) => [...prev, reply]);
    } catch (err: unknown) {
      setChatError(
        err instanceof Error ? err.message : 'Network error contacting assistant endpoint.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUser = messages[actualIdx];
    if (lastUser) sendMessage(lastUser.content, messages.slice(0, actualIdx));
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

      <AssistantControls
        locationName={currentLocation.name}
        aqiValue={snapshot.computedAqi.value}
        profileName={activeProfile.name}
        profileCategory={activeProfile.category}
        compareCityName={compareCityName}
        language={language}
        isSending={isSending}
        t={t}
        onCompareCityChange={setCompareCityName}
        onSelectPrompt={(q) => sendMessage(q)}
      />

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
          messages.map((m) => (
            <AssistantMessageCard
              key={m.id}
              message={m}
              isSending={isSending}
              t={t}
              onFollowUp={(fq) => sendMessage(fq)}
            />
          ))
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
          maxLength={PUBLIC_SECURITY_LIMITS.maxQuestionLength}
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
