'use client';

import {
  ChannelAvatar,
  useChannelPreviewInfo,
  useChannelStateContext,
} from 'stream-chat-react';
import { usePresence } from '@/hooks/use-live-presence';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { PresenceIndicator } from '@/components/presence/presence-indicator';

interface ChatHeaderProps {
  currentUserId: string;
}

export function ChatHeader({ currentUserId }: ChatHeaderProps) {
  const { channel } = useChannelStateContext();
  const { client } = useStreamChatContext();
  const { displayTitle, displayImage, groupChannelDisplayInfo } =
    useChannelPreviewInfo({ channel });

  const members = channel?.state?.members ?? {};
  const otherIds = Object.keys(members).filter((id) => id !== currentUserId);
  const isOneOnOne = otherIds.length === 1;

  const { presence, isLoading, error } = usePresence(client, otherIds);
  const otherPresence = isOneOnOne ? presence.get(otherIds[0]) : null;

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0 flex-1 flex flex-col items-center justify-center">
        <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
          {displayTitle}
        </h2>
        {isOneOnOne ? (
          <PresenceIndicator
            online={otherPresence?.online}
            lastSeen={otherPresence?.lastActive}
            isLoading={isLoading && !otherPresence}
            error={error}
          />
        ) : (
          <span className="text-xs text-slate-500">
            {Object.keys(members).length} members
          </span>
        )}
      </div>
      <ChannelAvatar
        className="str-chat__avatar--channel-header"
        displayMembers={groupChannelDisplayInfo?.members}
        imageUrl={displayImage}
        size="lg"
        userName={displayTitle}
      />
    </div>
  );
}
