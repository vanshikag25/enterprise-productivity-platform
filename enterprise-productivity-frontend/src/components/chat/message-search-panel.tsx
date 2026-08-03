'use client';

import { useEffect, useState } from 'react';
import { useChannelStateContext, useChatContext } from 'stream-chat-react';
import type { MessageResponse } from 'stream-chat';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { scrollToMessage } from './scroll-to-message';

interface MessageSearchPanelProps {
  onClose: () => void;
}

export function MessageSearchPanel({ onClose }: MessageSearchPanelProps) {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const [results, setResults] = useState<MessageResponse[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channel || !client || !debouncedQuery.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    let isCancelled = false;

    async function runSearch() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await client!.search(
          { cid: channel!.cid },
          { text: { $autocomplete: debouncedQuery.trim() } },
          { limit: 25 },
        );

        if (isCancelled) return;

        const matched = response.results
          .map((r) => r.message)
          .filter((m): m is MessageResponse => Boolean(m?.id));

        setResults(matched);
        setActiveIndex(0);

        if (matched.length > 0) {
          scrollToMessage(matched[0].id);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Search failed. Please try again.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [channel, client, debouncedQuery]);

  function goToIndex(index: number) {
    if (results.length === 0) return;
    const wrapped = (index + results.length) % results.length;
    setActiveIndex(wrapped);
    scrollToMessage(results[wrapped].id);
  }

  return (
    <div className="absolute inset-x-0 top-0 z-40 border-b bg-white p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          placeholder="Search in this conversation…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.shiftKey ? goToIndex(activeIndex - 1) : goToIndex(activeIndex + 1);
            }
            if (e.key === 'Escape') onClose();
          }}
          className="flex-1 rounded border px-2 py-1 text-sm"
        />

        <button
          onClick={() => goToIndex(activeIndex - 1)}
          disabled={results.length === 0}
          aria-label="Previous match"
          className="rounded border px-2 py-1 text-xs disabled:opacity-40"
        >
          ↑
        </button>
        <button
          onClick={() => goToIndex(activeIndex + 1)}
          disabled={results.length === 0}
          aria-label="Next match"
          className="rounded border px-2 py-1 text-xs disabled:opacity-40"
        >
          ↓
        </button>

        <span className="w-16 shrink-0 text-center text-xs text-gray-400">
          {isLoading
            ? '…'
            : results.length > 0
              ? `${activeIndex + 1}/${results.length}`
              : debouncedQuery
                ? '0/0'
                : ''}
        </span>

        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Close ×
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {!isLoading && !error && debouncedQuery.trim() && results.length === 0 && (
        <p className="mt-1 text-xs text-gray-400">No results found.</p>
      )}
    </div>
  );
}
