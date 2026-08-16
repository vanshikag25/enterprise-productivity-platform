'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  searchNaturalLanguage,
  type AiSearchResponse,
  type AiSearchResultItem,
} from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  IconArrowRight,
  IconClock,
  IconMessageCircle,
  IconSearch,
  IconSparkles,
} from '@/components/ui/icons';

const EXAMPLE_QUERIES = [
  'Show conversations about authentication from last week.',
  'Find discussions about the login bug.',
  'Show decisions made about the project this month.',
];

const SOURCE_LABEL: Record<string, string> = {
  chat: 'Chat',
  tasks: 'Task',
  meetings: 'Meeting',
  announcements: 'Announcement',
  projects: 'Project',
  milestones: 'Milestone',
  departments: 'Department',
};

const SOURCE_VARIANT: Record<string, 'gray' | 'blue' | 'violet' | 'amber' | 'green' | 'red' | 'cyan' | 'indigo'> = {
  chat: 'cyan',
  tasks: 'blue',
  meetings: 'violet',
  announcements: 'amber',
  projects: 'green',
  milestones: 'red',
  departments: 'gray',
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightText({
  text,
  keywords,
}: {
  text: string;
  keywords: string[];
}) {
  const terms = keywords.filter((k) => k.trim().length > 0);
  if (terms.length === 0) return <>{text}</>;

  const regex = new RegExp(terms.map(escapeRegExp).join('|'), 'gi');
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  matches.forEach((match, index) => {
    parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <mark key={index} className="rounded-sm bg-yellow-100 px-0.5 py-px text-slate-900">
        {match[0]}
      </mark>,
    );
    lastIndex = (match.index ?? 0) + match[0].length;
  });
  parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SearchPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<AiSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(rawQuery?: string) {
    const q = (rawQuery ?? query).trim();
    if (q.length < 2 || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      setResponse(await searchNaturalLanguage(token, q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const intentSummary = useMemo(() => {
    if (!response) return null;
    const intent = response.intent;
    const bits: string[] = [];
    if (intent.intent && intent.intent !== 'find') bits.push(intent.intent);
    if (intent.keywords.length > 0) bits.push(`keywords: ${intent.keywords.join(', ')}`);
    const range =
      intent.startDate || intent.endDate
        ? `${intent.startDate ? formatDate(intent.startDate) : '…'} – ${intent.endDate ? formatDate(intent.endDate) : '…'}`
        : null;
    if (range) bits.push(`range: ${range}`);
    if (intent.sources.length > 0)
      bits.push(`in: ${intent.sources.map((s) => SOURCE_LABEL[s] ?? s).join(', ')}`);
    return bits;
  }, [response]);

  function openResult(result: AiSearchResultItem) {
    router.push(result.url);
  }

  return (
    <div className="page-container">
      <PageHeader
        title="AI Search"
        subtitle="Ask in plain English, get conversations, tasks, meetings, and announcements that match."
        icon={<IconSparkles width={20} height={20} className="text-violet-500" />}
      />

      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <div className="relative">
          <IconSearch
            width={18}
            height={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "Show conversations about authentication from last week."'
            aria-label="Natural language search query"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-28 text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || query.trim().length < 2}
            className="absolute right-2 top-1/2 -translate-y-1/2 gap-1.5"
          >
            {isLoading ? (
              <Spinner size={16} />
            ) : (
              <IconSearch width={14} height={14} />
            )}
            {isLoading ? 'Searching…' : 'Search'}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Examples:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setQuery(example);
                void runSearch(example);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {isLoading && <SkeletonList count={3} />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void runSearch()} />
      )}

      {!isLoading && !error && response && response.total === 0 && (
        <EmptyState
          icon={<IconMessageCircle width={26} height={26} />}
          title="No results found"
          description="Nothing matched your query in the conversations you can access. Try different keywords or a wider date range."
        />
      )}

      {!isLoading && !error && response && response.total > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {response.total} result{response.total === 1 ? '' : 's'}
            </span>
            {intentSummary && (
              <>
                <span className="text-slate-300">·</span>
                <span className="max-w-2xl truncate">{intentSummary.join(' · ')}</span>
              </>
            )}
            <span className="text-slate-300">·</span>
            <Badge variant="violet">
              {response.provider === 'mock' ? 'offline AI' : response.provider}
            </Badge>
          </div>

          <div className="data-list">
            {response.results.map((result) => {
              const sourceLabel = SOURCE_LABEL[result.source] ?? 'Chat';
              return (
                <button
                  key={result.id}
                  onClick={() => openResult(result)}
                  className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <Avatar
                    name={result.senderName ?? result.senderId ?? 'Unknown'}
                    imageUrl={result.senderImageUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {result.senderName ?? result.senderId ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-400">in</span>
                      <span className="truncate text-sm text-slate-600">
                        {result.channelName ?? 'Conversation'}
                      </span>
                      <Badge variant={SOURCE_VARIANT[result.source] ?? 'gray'}>
                        {sourceLabel}
                      </Badge>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                        <IconClock width={12} height={12} />
                        {formatDate(result.createdAt)} · {formatTime(result.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-700">
                      <HighlightText text={result.preview} keywords={result.matchedKeywords} />
                    </p>
                    {result.matchedKeywords.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {result.matchedKeywords.map((kw) => (
                          <Badge key={kw} variant="amber">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <IconArrowRight className="mt-1 shrink-0 text-slate-300" width={16} height={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}