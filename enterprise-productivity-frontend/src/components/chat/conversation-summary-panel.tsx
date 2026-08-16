'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChannelStateContext } from 'stream-chat-react';
import { useAuth } from '@/lib/auth';
import {
  type ConversationSummaryItem,
  type SummaryPeriodType,
  fetchConversationSummaries,
  fetchDailySummary,
  fetchWeeklySummary,
  generateConversationSummary,
} from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { IconSparkles } from '@/components/ui/icons';

interface ConversationSummaryPanelProps {
  onClose: () => void;
}

const PERIOD_LABELS: Record<SummaryPeriodType, string> = {
  daily: 'Daily Summary',
  weekly: 'Weekly Summary',
  manual: 'AI Summary',
};

const PERIOD_ICONS: Record<SummaryPeriodType, string> = {
  daily: '📅',
  weekly: '🗓️',
  manual: '🤖',
};

function formatPeriod(item: ConversationSummaryItem): string {
  if (item.periodType === 'daily') return 'Today';
  if (item.periodType === 'weekly') {
    const start = new Date(item.periodStart).toLocaleDateString();
    const end = new Date(item.periodEnd).toLocaleDateString();
    return `${start} – ${end}`;
  }
  return 'Full conversation';
}

function SectionList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: string[];
}) {
  return (
    <div className="mt-2">
      <h4 className="mb-1 text-xs font-semibold text-slate-500">
        <span aria-hidden="true" className="mr-1">
          {icon}
        </span>
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">None detected.</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-gray-600">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryBody({ item }: { item: ConversationSummaryItem }) {
  return (
    <>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
        {item.overview}
      </p>
      <SectionList title="Key decisions" icon="🧭" items={item.keyDecisions} />
      <SectionList title="Action items" icon="✅" items={item.actionItems} />
      <SectionList
        title="Unresolved topics"
        icon="❓"
        items={item.unresolvedTopics}
      />
      <p className="mt-2 text-[11px] text-gray-400">
        {item.messageCount} messages · generated{' '}
        {new Date(item.generatedAt).toLocaleString()} · {item.provider} provider
      </p>
    </>
  );
}

export function ConversationSummaryPanel({
  onClose,
}: ConversationSummaryPanelProps) {
  const { channel } = useChannelStateContext();
  const channelId = channel?.id;
  const { getToken } = useAuth();

  const [daily, setDaily] = useState<ConversationSummaryItem | null>(null);
  const [weekly, setWeekly] = useState<ConversationSummaryItem | null>(null);
  const [history, setHistory] = useState<ConversationSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<SummaryPeriodType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (targetChannelId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      const [d, w, list] = await Promise.all([
        fetchDailySummary(token, targetChannelId),
        fetchWeeklySummary(token, targetChannelId),
        fetchConversationSummaries(token, targetChannelId),
      ]);
      return { daily: d, weekly: w, history: list };
    },
    [getToken],
  );

  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await loadData(channelId);
        if (cancelled) return;
        setDaily(data.daily);
        setWeekly(data.weekly);
        setHistory(data.history);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load summaries.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, loadData]);

  async function retry() {
    if (!channelId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadData(channelId);
      setDaily(data.daily);
      setWeekly(data.weekly);
      setHistory(data.history);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load summaries.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(periodType: SummaryPeriodType) {
    if (!channelId) return;
    setGenerating(periodType);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      const item = await generateConversationSummary(token, {
        channelId,
        periodType,
      });
      if (periodType === 'daily') setDaily(item);
      if (periodType === 'weekly') setWeekly(item);
      setHistory((prev) => [
        item,
        ...prev.filter((entry) => entry.id !== item.id),
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate summary.',
      );
    } finally {
      setGenerating(null);
    }
  }

  const manual = history.find((item) => item.periodType === 'manual') ?? null;

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-full max-w-xs flex-col overflow-y-auto border-l bg-white shadow-lg sm:w-80">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <IconSparkles width={14} height={14} className="text-blue-600" />
          AI Summary
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Close ×
        </button>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <button
          onClick={() => void regenerate('manual')}
          disabled={generating !== null}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {generating === 'manual'
            ? 'Generating…'
            : manual
              ? 'Regenerate summary'
              : 'Generate summary'}
        </button>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
            {error}
            <button
              onClick={() => void retry()}
              className="ml-1 font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <PeriodCard
              label={PERIOD_LABELS.daily}
              icon={PERIOD_ICONS.daily}
              item={daily}
              isGenerating={generating === 'daily'}
              onGenerate={() => void regenerate('daily')}
            />
            <PeriodCard
              label={PERIOD_LABELS.weekly}
              icon={PERIOD_ICONS.weekly}
              item={weekly}
              isGenerating={generating === 'weekly'}
              onGenerate={() => void regenerate('weekly')}
            />
            {manual && (
              <PeriodCard
                label={PERIOD_LABELS.manual}
                icon={PERIOD_ICONS.manual}
                item={manual}
                isGenerating={generating === 'manual'}
                onGenerate={() => void regenerate('manual')}
              />
            )}
          </>
        )}

        {!loading && history.length > 1 && (
          <div>
            <h4 className="mb-1 text-xs font-semibold text-slate-500">
              Past summaries
            </h4>
            <ul className="flex flex-col gap-2">
              {history.map((item) => (
                <li key={item.id}>
                  <details className="rounded-lg border p-2.5">
                    <summary className="cursor-pointer list-none text-xs font-medium text-slate-700">
                      <span aria-hidden="true" className="mr-1">
                        {PERIOD_ICONS[item.periodType]}
                      </span>
                      {PERIOD_LABELS[item.periodType]} ·{' '}
                      {formatPeriod(item)}
                    </summary>
                    <div className="mt-2">
                      <SummaryBody item={item} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && !manual && !daily && !weekly && (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-gray-400">
            No summaries yet. Generate one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function PeriodCard({
  label,
  icon,
  item,
  isGenerating,
  onGenerate,
}: {
  label: string;
  icon: string;
  item: ConversationSummaryItem | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-lg border p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden="true">{icon}</span>
          {label}
        </h3>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : item ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {isGenerating ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : item ? (
        <>
          <p className="mb-2 text-[11px] text-gray-400">
            {formatPeriod(item)}
          </p>
          <SummaryBody item={item} />
        </>
      ) : (
        <p className="text-xs text-gray-400">Not generated yet.</p>
      )}
    </section>
  );
}
