'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useChannelStateContext } from 'stream-chat-react';
import { useAuth } from '@/lib/auth';
import { translateMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export interface MessageTranslationState {
  translatedText: string;
  targetLanguage: string;
  sourceLanguage: string | null;
  hidden: boolean;
  loading: boolean;
  error: string | null;
}

interface TranslationContextValue {
  getTranslation: (messageId?: string) => MessageTranslationState | undefined;
  translate: (messageId: string, targetLanguage: string) => Promise<void>;
  hideTranslation: (messageId: string) => void;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function useMessageTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error(
      'useMessageTranslation must be used within TranslationProvider.',
    );
  }
  return ctx;
}

interface TranslationsChannelBodyProps {
  channelId: string;
  children: ReactNode;
}

/**
 * Holds per-message translation results for the active channel. Mounted once
 * per channel (keyed by channel.id in the provider below) so switching
 * conversations resets the cache cleanly.
 */
function TranslationsChannelBody({
  channelId,
  children,
}: TranslationsChannelBodyProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [byMessageId, setByMessageId] = useState<
    Record<string, MessageTranslationState>
  >({});

  const translate = useCallback(
    async (messageId: string, targetLanguage: string) => {
      const existing = byMessageId[messageId];
      if (
        existing &&
        existing.targetLanguage === targetLanguage &&
        !existing.loading
      ) {
        // Toggle the visible translation back on (it was hidden) — the
        // backend cache already holds it, so no request is needed.
        setByMessageId((prev) => ({
          ...prev,
          [messageId]: { ...prev[messageId], hidden: false, error: null },
        }));
        return;
      }

      const token = await getToken();
      if (!token) {
        showToast('You are not signed in.', 'error');
        return;
      }

      setByMessageId((prev) => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          targetLanguage,
          hidden: false,
          loading: true,
          error: null,
        },
      }));

      try {
        const result = await translateMessage(token, {
          channelId,
          messageId,
          targetLanguage,
        });
        setByMessageId((prev) => ({
          ...prev,
          [messageId]: {
            translatedText: result.translatedText,
            targetLanguage: result.targetLanguage,
            sourceLanguage: result.sourceLanguage,
            hidden: false,
            loading: false,
            error: null,
          },
        }));
      } catch (err) {
        setByMessageId((prev) => {
          const next = prev[messageId];
          if (!next) return prev;
          return {
            ...prev,
            [messageId]: {
              ...next,
              loading: false,
              error:
                err instanceof Error
                  ? err.message
                  : 'Failed to translate message.',
            },
          };
        });
      }
    },
    [byMessageId, channelId, getToken, showToast],
  );

  const hideTranslation = useCallback((messageId: string) => {
    setByMessageId((prev) =>
      prev[messageId]
        ? { ...prev, [messageId]: { ...prev[messageId], hidden: true } }
        : prev,
    );
  }, []);

  const value = useMemo<TranslationContextValue>(
    () => ({
      getTranslation: (messageId) =>
        messageId ? byMessageId[messageId] : undefined,
      translate,
      hideTranslation,
    }),
    [byMessageId, translate, hideTranslation],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Per-channel provider around the message UI. Reads the active stream channel
 * and keys its state on the channel id, mirroring the action-detection
 * provider so every conversation has its own translation cache.
 */
export function TranslationProvider({ children }: { children: ReactNode }) {
  const { channel } = useChannelStateContext();
  if (!channel?.id) return <>{children}</>;
  return (
    <TranslationsChannelBody channelId={channel.id}>
      {children}
    </TranslationsChannelBody>
  );
}