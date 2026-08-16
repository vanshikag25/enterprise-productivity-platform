'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Channel, LocalMessage } from 'stream-chat';
import { useChannelStateContext } from 'stream-chat-react';
import { useAuth } from '@/lib/auth';
import {
  analyzeMessageActions,
  dismissAction,
  fetchChannelActions,
  resolveAction,
  type DetectedActionItem,
} from '@/lib/api-client';

function groupByMessageId(
  items: DetectedActionItem[],
): Record<string, DetectedActionItem[]> {
  const grouped: Record<string, DetectedActionItem[]> = {};
  for (const item of items) {
    const key = item.messageId || item.id;
    (grouped[key] ??= []).push(item);
  }
  return grouped;
}

function mergeGroups(
  current: Record<string, DetectedActionItem[]>,
  incoming: Record<string, DetectedActionItem[]>,
): Record<string, DetectedActionItem[]> {
  const merged: Record<string, DetectedActionItem[]> = { ...current };
  for (const [messageId, items] of Object.entries(incoming)) {
    const present = new Map(
      (merged[messageId] ?? []).map((a) => [a.id, a]),
    );
    for (const item of items) present.set(item.id, item);
    const next = [...present.values()];
    merged[messageId] = next;
  }
  return merged;
}

interface AIActionDetectionValue {
  actionsByMessageId: Record<string, DetectedActionItem[]>;
  analyzingIds: string[];
  getActionsForMessage: (messageId?: string) => DetectedActionItem[];
  dismiss: (actionId: string) => Promise<void>;
  resolveDirect: (action: DetectedActionItem, note?: string) => Promise<void>;
  removeAction: (actionId: string) => void;
  reload: () => Promise<void>;
}

const AIActionDetectionContext = createContext<AIActionDetectionValue | null>(null);

export function useAIActionDetection(): AIActionDetectionValue {
  const ctx = useContext(AIActionDetectionContext);
  if (!ctx) {
    throw new Error(
      'useAIActionDetection must be used within AIActionDetectionProvider.',
    );
  }
  return ctx;
}

const ANALYZE_DEBOUNCE_MS = 900;

interface ChannelBodyProps {
  channel: Channel;
  channelId: string;
  children: ReactNode;
}

/**
 * State-holding subtree. Mounted once per channel (keyed by channel.id in the
 * provider below) so switching conversations resets the card state cleanly.
 */
function AIActionDetectionChannelBody({
  channel,
  channelId,
  children,
}: ChannelBodyProps) {
  const { getToken } = useAuth();

  const [actionsByMessageId, setActionsByMessageId] = useState<
    Record<string, DetectedActionItem[]>
  >({});
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);

  const pendingMessageIdsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<number | null>(null);

  const analyse = useCallback(
    async (messageId: string) => {
      setAnalyzingIds((prev) =>
        prev.includes(messageId) ? prev : [...prev, messageId],
      );
      try {
        const token = await getToken();
        if (!token) return;
        const result = await analyzeMessageActions(
          token,
          channelId,
          messageId,
        );
        const items = result.actions.filter((a) => a.status === 'pending');
        if (items.length) {
          setActionsByMessageId((prev) =>
            mergeGroups(prev, groupByMessageId(items)),
          );
        }
      } catch {
        // AI analysis is best-effort — never block the conversation.
      } finally {
        setAnalyzingIds((prev) => prev.filter((id) => id !== messageId));
      }
    },
    [channelId, getToken],
  );

  const flushPending = useCallback(() => {
    debounceTimerRef.current = null;
    const ids = [...pendingMessageIdsRef.current];
    pendingMessageIdsRef.current.clear();
    for (const id of ids) void analyse(id);
  }, [analyse]);

  useEffect(() => {
    const pendingMessageIds = pendingMessageIdsRef.current;
    const subscription = channel.on('message.new', (event) => {
      const message = (event as { message?: LocalMessage }).message;
      const id = message?.id;
      if (!id) return;
      pendingMessageIds.add(id);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(
        flushPending,
        ANALYZE_DEBOUNCE_MS,
      );
    });
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingMessageIds.clear();
    };
  }, [channel, flushPending]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const items = await fetchChannelActions(token, channelId);
        if (!cancelled) setActionsByMessageId(groupByMessageId(items));
      } catch {
        // Best-effort refresh — the message.new path keeps the list warm.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, getToken]);

  const removeAction = useCallback((actionId: string) => {
    setActionsByMessageId((prev) => {
      const next: Record<string, DetectedActionItem[]> = {};
      for (const [messageId, items] of Object.entries(prev)) {
        const filtered = items.filter((a) => a.id !== actionId);
        if (filtered.length) next[messageId] = filtered;
      }
      return next;
    });
  }, []);

  const dismiss = useCallback(
    async (actionId: string) => {
      try {
        const token = await getToken();
        if (token) await dismissAction(token, actionId);
      } finally {
        removeAction(actionId);
      }
    },
    [getToken, removeAction],
  );

  const resolveDirect = useCallback(
    async (action: DetectedActionItem, note?: string) => {
      try {
        const token = await getToken();
        if (token) {
          await resolveAction(token, action.id, {
            entityType: action.intentType,
            note: note ?? action.title,
          });
        }
      } finally {
        removeAction(action.id);
      }
    },
    [getToken, removeAction],
  );

  const reload = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const items = await fetchChannelActions(token, channelId);
      setActionsByMessageId(groupByMessageId(items));
    } catch {
      // Best-effort refresh — the message.new path keeps the list warm.
    }
  }, [channelId, getToken]);

  const value = useMemo<AIActionDetectionValue>(
    () => ({
      actionsByMessageId,
      analyzingIds,
      getActionsForMessage: (messageId) =>
        messageId ? actionsByMessageId[messageId] ?? [] : [],
      dismiss,
      resolveDirect,
      removeAction,
      reload,
    }),
    [actionsByMessageId, analyzingIds, dismiss, resolveDirect, removeAction, reload],
  );

  return (
    <AIActionDetectionContext.Provider value={value}>
      {children}
    </AIActionDetectionContext.Provider>
  );
}

/**
 * Loads the pending AI-detected actions for the active channel, then keeps
 * analysing new `message.new` events so action cards appear shortly after a
 * message is sent. All failures are swallowed so chat is never blocked.
 */
export function AIActionDetectionProvider({ children }: { children: ReactNode }) {
  const { channel } = useChannelStateContext();
  if (!channel?.id) return <>{children}</>;
  return (
    <AIActionDetectionChannelBody
      key={channel.id}
      channel={channel}
      channelId={channel.id}
    >
      {children}
    </AIActionDetectionChannelBody>
  );
}