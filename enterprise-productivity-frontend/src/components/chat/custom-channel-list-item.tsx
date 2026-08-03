'use client';

import type { MouseEvent } from 'react';
import { ChannelAvatar, ChannelListItemTimestamp } from 'stream-chat-react';
import type { Channel as StreamChannel } from 'stream-chat';
import { PresenceIndicator } from '@/components/presence/presence-indicator';

interface CustomChannelListItemProps {
  active?: boolean;
  channel: StreamChannel;
  displayImage?: string;
  displayTitle?: string;
  latestMessagePreview?: unknown;
  onSelect?: (event: MouseEvent) => void;
  setActiveChannel?: (channel: StreamChannel) => void;
}

function getPreviewText(preview: unknown): string {
  if (!preview) return '';
  if (typeof preview === 'string') return preview;
  if (typeof preview === 'object' && preview !== null && 'text' in preview) {
    const text = (preview as { text?: unknown }).text;
    return typeof text === 'string' ? text : '';
  }
  return '';
}

function getOtherMemberPresence(
  channel: StreamChannel,
  currentUserId: string,
): { online: boolean; lastActive: string | null } | null {
  const members = channel.state?.members ?? {};
  const memberIds = Object.keys(members);

  if (memberIds.length !== 2) {
    return null;
  }

  const otherId = memberIds.find((id) => id !== currentUserId);
  if (!otherId) return null;

  const otherUser = members[otherId]?.user;
  if (!otherUser) return null;

  return {
    online: Boolean(otherUser.online),
    lastActive: otherUser.last_active ?? null,
  };
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
    const unreadCount = channel.countUnread();
    const otherPresence = getOtherMemberPresence(channel, currentUserId);
    const previewText = getPreviewText(latestMessagePreview);
    const lastMessage = channel.state?.latestMessages?.at(-1);
    const isArchived = Boolean((channel.data as { frozen?: boolean } | undefined)?.frozen);

    return (
      <button
        aria-pressed={active}
        onClick={(event) => {
          if (onSelect) {
            onSelect(event);
          } else {
            setActiveChannel?.(channel);
          }
        }}
        className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors ${
          active
            ? 'bg-blue-50/70 hover:bg-blue-50'
            : 'hover:bg-slate-50'
        }`}
      >
        <div className="relative shrink-0">
          <ChannelAvatar imageUrl={displayImage} userName={displayTitle} size="lg" />
          {otherPresence?.online && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
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
            <span className={`truncate text-xs ${unreadCount > 0 ? 'font-medium text-slate-600' : 'text-slate-400'}`}>{previewText}</span>
            {unreadCount > 0 && (
              <span className="ml-2 shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {otherPresence && (
            <PresenceIndicator
              online={otherPresence.online}
              lastSeen={otherPresence.lastActive}
              variant="compact"
            />
          )}

          {/* Typing indicator placeholder — structure reserved only, not wired up yet */}
          <div className="h-3 text-[10px] text-slate-400" data-typing-indicator-placeholder />
        </div>
      </button>
    );
  };
}
