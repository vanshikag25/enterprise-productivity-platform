'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Channel,
  Window,
  MessageList,
  Thread,
  WithComponents,
  useChatContext,
  useChannelStateContext,
  useChannelActionContext,
} from 'stream-chat-react';
import { ChatHeader } from '@/components/chat/chat-header';
import { TypingIndicatorText } from '@/components/chat/typing-indicator-text';
import { MessageComposerWithDrafts } from '@/components/chat/message-composer-with-drafts';
import { MessageReadStatus } from '@/components/chat/message-read-status';
import { reactionOptions } from '@/components/chat/reaction-options';
import { SingleChoiceReactionSelector } from '@/components/chat/single-choice-reaction-selector';
import { MessageActionsWithConfirm } from '@/components/chat/message-actions-with-confirm';
import { MessageActionsWithProductivity } from '@/components/message-actions/message-actions-with-productivity';
import { MessageActionsContextMenu } from '@/components/message-actions/message-actions-context-menu';
import { PollContentWithManage } from '@/components/message-actions/poll-manage-actions';
import { MessageSearchPanel } from '@/components/chat/message-search-panel';
import { scrollToMessage } from '@/components/chat/scroll-to-message';
import { AIActionDetectionProvider } from '@/components/action-detection/action-detection-context';
import { TranslationProvider } from '@/components/chat/translation-context';
import { MessageWithAiActions } from '@/components/action-detection/message-with-ai-actions';
import { useAuth } from '@/lib/auth';
import { deleteChatMessage, editChatMessage, setChannelLock } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { canModerateChannel } from '@/lib/moderation-scope';
import { IconRefresh, IconSearch } from '@/components/ui/icons';

export function ChannelWorkspace() {
  const { channel } = useChatContext();
  const { getToken } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedMessageId = searchParams.get('message');

  const doUpdateMessageRequest = useCallback(
    async (cid: string, updatedMessage: Parameters<NonNullable<React.ComponentProps<typeof Channel>['doUpdateMessageRequest']>>[1]) => {
      const id = typeof updatedMessage === 'string' ? updatedMessage : updatedMessage.id;
      const text = typeof updatedMessage === 'object' && typeof updatedMessage.text === 'string' ? updatedMessage.text : undefined;
      if (!id) throw new Error('Cannot edit a message - missing message ID.');
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      await editChatMessage(token, id, text ?? '');
      if (typeof updatedMessage === 'string') {
        return channel!.getClient().updateMessage({ id, text: text ?? '' });
      }
      return channel!.getClient().updateMessage(updatedMessage);
    },
    [getToken, channel],
  );

  const doDeleteMessageRequest = useCallback(
    async (message: Parameters<NonNullable<React.ComponentProps<typeof Channel>['doDeleteMessageRequest']>>[0]) => {
      if (!message?.id) throw new Error('Cannot delete a message - missing message ID.');
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      await deleteChatMessage(token, message.id);
      return (await channel!.getClient().deleteMessage(message.id, { hardDelete: false })).message;
    },
    [getToken, channel],
  );

  if (!channel) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <div className="subtle-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-slate-300">
          <IconSearch width={24} height={24} />
        </div>
        <p className="text-sm font-medium text-slate-500">Select a conversation</p>
        <p className="text-xs">Pick a channel or message to start chatting.</p>
      </div>
    );
  }

  return (
    <WithComponents
      overrides={{
        ReactionSelector: SingleChoiceReactionSelector,
        MessageActions: MessageActionsWithProductivity,
        MessageStatus: MessageReadStatus,
        PollContent: PollContentWithManage,
        MessageUI: MessageWithAiActions,
        ContextMenu: MessageActionsContextMenu,
        reactionOptions,
      }}
    >
      <Channel
        doUpdateMessageRequest={doUpdateMessageRequest}
        doDeleteMessageRequest={doDeleteMessageRequest}
      >
        <AIActionDetectionProvider>
          <TranslationProvider>
            <Window>
              <ChatHeader
                currentUserId={channel.getClient().userID ?? ''}
                showSearch={showSearch}
                onToggleSearch={() => {
                  setShowSearch((v) => !v);
                }}
              />

              <MessageList />
              <TypingIndicatorText />
              <MessageComposerOrArchiveNotice />
            </Window>
            <Thread />

            {showSearch && (
              <MessageSearchPanel onClose={() => setShowSearch(false)} />
            )}
            {requestedMessageId && (
              <JumpToMessage
                messageId={requestedMessageId}
                onHandled={() => router.replace(pathname)}
              />
            )}
          </TranslationProvider>
        </AIActionDetectionProvider>
      </Channel>
    </WithComponents>
  );
}

function JumpToMessage({
  messageId,
  onHandled,
}: {
  messageId: string;
  onHandled: () => void;
}) {
  const { jumpToMessage } = useChannelActionContext();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await jumpToMessage(messageId, 50, 2000);
      } catch {
        scrollToMessage(messageId);
      }
      if (!cancelled) onHandled();
    })();

    return () => {
      cancelled = true;
    };
  }, [jumpToMessage, messageId, onHandled]);

  return null;
}

function MessageComposerOrArchiveNotice() {
  const { channel } = useChannelStateContext();
  const { getToken } = useAuth();
  const { role } = useRole();
  const { showToast } = useToast();
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  const isArchived = Boolean(
    (channel.data as { frozen?: boolean } | undefined)?.frozen,
  );

  const actorId = channel.getClient().userID ?? '';
  const myMember = (channel.state?.members ?? {})[actorId] as
    | { is_moderator?: boolean; channel_role?: string }
    | undefined;
  const canModerate = canModerateChannel(
    role,
    (channel.data as { created_by_id?: string } | undefined)?.created_by_id,
    myMember,
    actorId,
  );

  async function handleUnarchive() {
    if (!channel?.id) return;
    setIsUnarchiving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      await setChannelLock(token, {
        channelId: channel.id,
        locked: false,
      });
      showToast('Conversation unarchived.');
      await channel.watch().catch(() => undefined);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to unarchive conversation.',
        'error',
      );
    } finally {
      setIsUnarchiving(false);
    }
  }

  if (isArchived) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">
          This conversation is archived and read-only. History and attachments
          are still available.
        </p>
        {canModerate && (
          <button
            type="button"
            onClick={() => void handleUnarchive()}
            disabled={isUnarchiving}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
          >
            <IconRefresh width={13} height={13} />
            {isUnarchiving ? 'Unarchiving…' : 'Unarchive'}
          </button>
        )}
      </div>
    );
  }
  return <MessageComposerWithDrafts />;
}