'use client';

import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { ChannelAvatar, ChannelListItemTimestamp } from 'stream-chat-react';
import type { Channel as StreamChannel } from 'stream-chat';
import { StatusDot } from '@/components/presence/status-dot';
import { resolveUserStatus } from '@/lib/user-status';
import { useToast } from '@/hooks/use-toast';
import { IconTrash } from '@/components/ui/icons';

interface CustomChannelListItemProps {
  active?: boolean;
  channel: StreamChannel;
  displayImage?: string;
  displayTitle?: string;
  latestMessagePreview?: ReactNode;
  onSelect?: (event: MouseEvent) => void;
  setActiveChannel?: (channel: StreamChannel) => void;
}

function getOtherMemberPresence(
  channel: StreamChannel,
  currentUserId: string,
): { online: boolean; lastActive: string | null; status: string | null } | null {
  const members = channel.state?.members ?? {};
  const memberIds = Object.keys(members);

  if (memberIds.length !== 2) {
    return null;
  }

  const otherId = memberIds.find((id) => id !== currentUserId);
  if (!otherId) return null;

  const otherUser = members[otherId]?.user;
  if (!otherUser) return null;

  const customStatus = (otherUser as { status?: unknown }).status;

  return {
    online: Boolean(otherUser.online),
    lastActive: otherUser.last_active ?? null,
    status: typeof customStatus === 'string' ? customStatus : null,
  };
}

function isDeletableChat(channel: StreamChannel): boolean {
  const kind = (channel.data as { channel_kind?: string } | undefined)?.channel_kind;
  return kind !== 'announcement';
}

export function createCustomChannelListItem(currentUserId: string) {
  return function CustomChannelListItem({
    active,
    channel,
    displayImage,
    displayTitle,
    latestMessagePreview,
    onSelect,
    setActiveChannel,
  }: CustomChannelListItemProps) {
    const { showToast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const unreadCount = channel.countUnread();
    const otherPresence = getOtherMemberPresence(channel, currentUserId);
    const lastMessage = channel.state?.latestMessages?.at(-1);
    const isArchived = Boolean((channel.data as { frozen?: boolean } | undefined)?.frozen);
    const canDelete = isDeletableChat(channel);

    function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (onSelect) {
        onSelect(event as unknown as MouseEvent);
      } else {
        setActiveChannel?.(channel);
      }
    }

    async function handleDeleteChat(event: MouseEvent) {
      event.stopPropagation();
      if (isDeleting) return;
      const label = displayTitle || 'this chat';
      if (
        !window.confirm(
          `Delete the chat with ${label} from your list? You will see it again if there is new activity.`,
        )
      ) {
        return;
      }
      setIsDeleting(true);
      try {
        await channel.hide();
        showToast('Chat deleted from your list.');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to delete chat.',
          'error',
        );
      } finally {
        setIsDeleting(false);
      }
    }

    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={active}
        onClick={(event) => {
          if (onSelect) {
            onSelect(event);
          } else {
            setActiveChannel?.(channel);
          }
        }}
        onKeyDown={handleRowKeyDown}
        className={`group relative flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors ${
          active
            ? 'bg-blue-50/70 hover:bg-blue-50'
            : 'hover:bg-slate-50'
        }`}
      >
        <div className="relative shrink-0">
          <ChannelAvatar imageUrl={displayImage} userName={displayTitle} size="lg" />
          {otherPresence && (
            <StatusDot
              status={resolveUserStatus(
                otherPresence.online,
                otherPresence.status,
              )}
              size="sm"
              className="absolute bottom-0 right-0"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate text-sm ${active ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{displayTitle}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              {isArchived && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  Archived
                </span>
              )}
              <ChannelListItemTimestamp lastMessage={lastMessage} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className={`min-w-0 flex-1 truncate text-xs [&_p]:m-0 [&_p]:truncate ${
                unreadCount > 0 ? 'font-medium text-slate-600' : 'text-slate-400'
              }`}
            >
              {latestMessagePreview || 'Nothing yet...'}
            </div>
            {unreadCount > 0 && (
              <span className="ml-2 shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Typing indicator placeholder — structure reserved only, not wired up yet */}
          <div className="h-3 text-[10px] text-slate-400" data-typing-indicator-placeholder />
        </div>

        {canDelete && (
          <button
            type="button"
            aria-label={`Delete chat ${displayTitle ?? ''}`}
            title="Delete chat"
            disabled={isDeleting}
            onClick={handleDeleteChat}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-white text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-200 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
          >
            <IconTrash width={14} height={14} />
          </button>
        )}
      </div>
    );
  };
}
