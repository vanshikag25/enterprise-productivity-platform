'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChannelList,
  Channel,
  Window,
  MessageList,
  MessageComposer,
  Thread,
  WithComponents,
  useChatContext,
  useChannelStateContext,
  useChannelActionContext,
} from 'stream-chat-react';
import type { StreamChat } from 'stream-chat';
import { UserList } from './user-list';
import { NewGroupModal } from './new-group-modal';
import { createCustomChannelListItem } from './custom-channel-list-item';
import { ChatHeader } from './chat-header';
import { TypingIndicatorText } from './typing-indicator-text';
import { MessageReadStatus } from './message-read-status';
import { reactionOptions } from './reaction-options';
import { SingleChoiceReactionSelector } from './single-choice-reaction-selector';
import { MessageActionsWithConfirm } from './message-actions-with-confirm';
import { MessageActionsWithProductivity } from '@/components/message-actions/message-actions-with-productivity';
import { PollContentWithManage } from '@/components/message-actions/poll-manage-actions';
import { PinnedMessagesPanel } from './pinned-messages-panel';
import { MessageSearchPanel } from './message-search-panel';
import { GroupSettingsDrawer } from './group-settings-drawer';
import { scrollToMessage } from './scroll-to-message';
import { IconPin, IconSearch, IconSettings, IconUsers } from '@/components/ui/icons';

interface ChatBodyProps {
  userId: string;
  client: StreamChat;
}

export function ChatBody({ userId, client }: ChatBodyProps) {
  const { channel, setActiveChannel } = useChatContext();
  const [channelListKey, setChannelListKey] = useState(0);
  const [showPinned, setShowPinned] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openedChannelRef = useRef<string | null>(null);

  const requestedChannelId = searchParams.get('channel');
  const requestedMessageId = searchParams.get('message');
  const shouldOpenGroupPanel = searchParams.get('startGroup') === '1';

  useEffect(() => {
    if (!requestedChannelId) return;
    if (openedChannelRef.current === requestedChannelId) return;

    let isCancelled = false;

    async function openRequestedChannel() {
      const targetChannel = client.channel('messaging', requestedChannelId!);
      await targetChannel.watch();

      if (!isCancelled) {
        setActiveChannel(targetChannel);
        openedChannelRef.current = requestedChannelId;
        // Leave the `message` param in place so JumpToMessage can navigate;
        // it clears the URL itself once the jump completes.
        if (!requestedMessageId) router.replace(pathname);
      }
    }

    openRequestedChannel();

    return () => {
      isCancelled = true;
    };
  }, [requestedChannelId, requestedMessageId, client, setActiveChannel, router, pathname]);

  useEffect(() => {
    setShowPinned(false);
    setShowSearch(false);
    setShowGroupSettings(false);
  }, [channel]);

  function handleChannelReady(readyChannel: NonNullable<typeof channel>) {
    setActiveChannel(readyChannel);
    setChannelListKey((prev) => prev + 1);
  }

  const CustomChannelListItem = createCustomChannelListItem(userId);
  const memberCount = Object.keys(channel?.state?.members ?? {}).length;
  // A channel is a group when it was created with a custom name — even a
  // 2-member group must expose group management so members can be added later.
  const channelData = channel?.data as
    | { name?: string; description?: string }
    | undefined;
  const isGroupChat = Boolean(channelData?.name);
  const groupDescription = channelData?.description ?? null;

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <div className="flex w-full shrink-0 flex-col overflow-y-auto border-b md:h-full md:max-w-xs md:border-b-0 md:border-r">
        <NewGroupModal
          onChannelReady={handleChannelReady}
          autoOpen={shouldOpenGroupPanel}
          onAutoOpenHandled={() => router.replace(pathname)}
        />
        <UserList onChannelReady={handleChannelReady} />

        <div className="flex-1 overflow-y-auto">
          <WithComponents overrides={{ ChannelListItemUI: CustomChannelListItem }}>
            <ChannelList
              key={channelListKey}
              filters={{ members: { $in: [userId] } }}
              sort={{ last_message_at: -1 }}
              showChannelSearch
            />
          </WithComponents>
        </div>
      </div>

      <div className="relative flex-1">
        {channel ? (
          <WithComponents
            overrides={{
              ReactionSelector: SingleChoiceReactionSelector,
              MessageActions: MessageActionsWithProductivity,
              MessageStatus: MessageReadStatus,
              PollContent: PollContentWithManage,
              reactionOptions,
            }}
          >
            <Channel>
              <Window>
                <ChatHeader currentUserId={userId} />

                <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-1.5">
                  <button
                    onClick={() => {
                      setShowPinned((v) => !v);
                      setShowSearch(false);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${showPinned ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <IconPin width={13} height={13} />
                    Pinned
                  </button>
                  <button
                    onClick={() => {
                      setShowSearch((v) => !v);
                      setShowPinned(false);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${showSearch ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <IconSearch width={13} height={13} />
                    Search
                  </button>
                  {isGroupChat && (
                    <button
                      onClick={() => {
                        setShowGroupSettings((v) => !v);
                        setShowPinned(false);
                        setShowSearch(false);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${showGroupSettings ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <IconSettings width={13} height={13} />
                      Group
                    </button>
                  )}
                </div>

                {/* {isGroupChat && (
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-1.5 text-xs text-slate-500">
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-slate-600">
                      <IconUsers width={13} height={13} />
                      {memberCount} members
                    </span>
                    {groupDescription && (
                      <span className="truncate">{groupDescription}</span>
                    )}
                    <button
                      onClick={() => {
                        setShowGroupSettings(true);
                        setShowPinned(false);
                        setShowSearch(false);
                      }}
                      className="ml-auto shrink-0 font-medium text-blue-600 hover:text-blue-700"
                    >
                      Settings
                    </button>
                  </div>
                )} */}

                <MessageList />
                <TypingIndicatorText />
                <MessageComposerOrArchiveNotice />
              </Window>
              <Thread />

              {showPinned && (
                <PinnedMessagesPanel onClose={() => setShowPinned(false)} />
              )}
              {showSearch && (
                <MessageSearchPanel onClose={() => setShowSearch(false)} />
              )}
              {showGroupSettings && (
                <GroupSettingsDrawer onClose={() => setShowGroupSettings(false)} />
              )}
              {requestedMessageId && (
                <JumpToMessage
                  messageId={requestedMessageId}
                  onHandled={() => router.replace(pathname)}
                />
              )}
            </Channel>
          </WithComponents>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <div className="subtle-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-slate-300">
              <IconSearch width={24} height={24} />
            </div>
            <p className="text-sm font-medium text-slate-500">Select a conversation</p>
            <p className="text-xs">Pick a channel or message to start chatting.</p>
          </div>
        )}
      </div>
    </div>
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
        // Fall back to a DOM-based scroll if the SDK cannot jump (e.g. the
        // message is not in the loaded window).
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
  const isArchived = Boolean(
    (channel.data as { frozen?: boolean } | undefined)?.frozen,
  );
  if (isArchived) {
    return (
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-500">
        This conversation is archived and read-only. History and attachments
        are still available.
      </div>
    );
  }
  return <MessageComposer audioRecordingEnabled />;
}
