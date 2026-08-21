'use client';

import { useChannelPreviewInfo, useChannelStateContext, useChatContext } from 'stream-chat-react';
import { usePresence } from '@/hooks/use-live-presence';
import { PresenceIndicator } from '@/components/presence/presence-indicator';
import { ConversationDetailsButton } from '@/components/chat/conversation-details-button';

/**
 * Header for the project/org chat windows. Mirrors the dashboard chat header
 * (title, presence/member count and a clickable avatar) without the dashboard
 * extras (lock, search, call controls).
 */
export function ProjectChannelHeader() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { displayTitle, displayImage, groupChannelDisplayInfo } =
    useChannelPreviewInfo({ channel });

  const currentUserId = client?.userID ?? '';
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
            manualStatus={otherPresence?.status}
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
      <ConversationDetailsButton
        className="str-chat__avatar--channel-header"
        displayMembers={groupChannelDisplayInfo?.members}
        imageUrl={displayImage}
        size="lg"
        userName={displayTitle}
      />
    </div>
  );
}