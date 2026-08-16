'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChannelStateContext } from 'stream-chat-react';
import { useAuth } from '@/lib/auth';
import { fetchSmartReplies } from '@/lib/api-client';
import { IconSparkles } from '@/components/ui/icons';

const REFRESH_DEBOUNCE_MS = 800;

interface SmartReplySuggestionsProps {
  onInsert: (suggestion: string) => void;
}

/**
 * Fetches and displays context-aware reply suggestions above the message
 * input. Suggestions refresh when new messages arrive. Clicking a suggestion
 * inserts it into the composer without sending.
 */
export function SmartReplySuggestions({ onInsert }: SmartReplySuggestionsProps) {
  const { channel } = useChannelStateContext();
  const channelId = channel?.id;
  const { getToken } = useAuth();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loadedChannelId, setLoadedChannelId] = useState<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const hiddenChannelIdRef = useRef<string | null>(null);
  const loadRepliesRef = useRef<(channelId: string) => Promise<void>>(
    async () => undefined,
  );

  const loadReplies = useCallback(
    async (targetChannelId: string) => {
      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve session token.');
        const res = await fetchSmartReplies(token, targetChannelId);
        setSuggestions(res.suggestions);
        setLoadedChannelId(targetChannelId);
        if (res.suggestions.length === 0) {
          setHidden(true);
        } else if (hiddenChannelIdRef.current !== targetChannelId) {
          setHidden(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load suggestions.',
        );
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        if (pendingRef.current) {
          pendingRef.current = false;
          void loadRepliesRef.current(targetChannelId);
        }
      }
    },
    [getToken],
  );

  useEffect(() => {
    loadRepliesRef.current = loadReplies;
  }, [loadReplies]);

  const isFreshForChannel = loadedChannelId === channelId;

  useEffect(() => {
    if (!channelId) return;
    lastMessageIdRef.current = null;
    pendingRef.current = false;
    hiddenChannelIdRef.current = null;
    const timer = setTimeout(() => {
      void loadReplies(channelId);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [channelId, loadReplies]);

  useEffect(() => {
    if (!channel) return;
    const handleNewMessage = (event: { message?: { id?: string } }) => {
      const messageId = event.message?.id ?? null;
      if (!messageId || messageId === lastMessageIdRef.current) return;
      lastMessageIdRef.current = messageId;
      if (!channelId) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        void loadReplies(channelId);
      }, REFRESH_DEBOUNCE_MS);
    };

    const subscription = channel.on('message.new', handleNewMessage);
    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [channel, channelId, loadReplies]);

  if (hidden) return null;
  if (!isFreshForChannel || (loading && suggestions.length === 0)) {
    return (
      <div className="px-4 pb-1 text-[11px] text-slate-400">
        <IconSparkles width={11} height={11} className="mr-1 inline text-blue-500" />
        Generating suggestions…
      </div>
    );
  }
  if (error && suggestions.length === 0) {
    return (
      <button
        onClick={() => channelId && void loadReplies(channelId)}
        className="px-4 pb-1 text-left text-[11px] text-slate-400 hover:text-slate-600"
      >
        Smart replies unavailable. Tap to retry.
      </button>
    );
  }
  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-3 pb-1.5">
      <span className="flex shrink-0 items-center gap-1 pr-1 text-[11px] font-medium text-slate-400">
        <IconSparkles width={12} height={12} className="text-blue-500" />
      </span>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => {
            onInsert(suggestion);
            setHidden(true);
            hiddenChannelIdRef.current = channelId ?? null;
          }}
          className="max-w-52 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          title={suggestion}
        >
          {suggestion}
        </button>
      ))}
      <button
        type="button"
        aria-label="Dismiss smart replies"
        onClick={() => {
          setHidden(true);
          hiddenChannelIdRef.current = channelId ?? null;
        }}
        className="ml-auto shrink-0 rounded p-0.5 text-slate-300 hover:text-slate-500"
      >
        ×
      </button>
    </div>
  );
}