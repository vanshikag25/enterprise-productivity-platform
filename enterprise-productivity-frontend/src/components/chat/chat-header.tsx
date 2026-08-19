'use client';

import { useState } from 'react';
import {
  ChannelAvatar,
  useChannelPreviewInfo,
  useChannelStateContext,
} from 'stream-chat-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { setChannelLock } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { canModerateChannel } from '@/lib/moderation-scope';
import { usePresence } from '@/hooks/use-live-presence';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { PresenceIndicator } from '@/components/presence/presence-indicator';
import { IconLock, IconSearch } from '@/components/ui/icons';

const LazyCallButtons = dynamic(
  () =>
    import('@/components/calls/call-buttons').then(
      (mod) => mod.CallButtons,
    ),
  { ssr: false, loading: () => null },
);

interface ChatHeaderProps {
  currentUserId: string;
  showSearch?: boolean;
  onToggleSearch?: () => void;
}

export function ChatHeader({ currentUserId, showSearch, onToggleSearch }: ChatHeaderProps) {
  const { channel } = useChannelStateContext();
  const { client } = useStreamChatContext();
  const { displayTitle, displayImage, groupChannelDisplayInfo } =
    useChannelPreviewInfo({ channel });
  const { getToken } = useAuth();
  const { role } = useRole();
  const { showToast } = useToast();

  const members = channel?.state?.members ?? {};
  const otherIds = Object.keys(members).filter((id) => id !== currentUserId);
  const isOneOnOne = otherIds.length === 1;

  const channelData = channel?.data as
    | { name?: string; created_by_id?: string; frozen?: boolean }
    | undefined;
  const isGroupChat = Boolean(channelData?.name);
  const kind: 'dm' | 'group' = isGroupChat ? 'group' : 'dm';

  const { presence, isLoading, error } = usePresence(client, otherIds);
  const otherPresence = isOneOnOne ? presence.get(otherIds[0]) : null;

  const [lockOverride, setLockOverride] = useState<{
    channelId?: string;
    value: boolean;
  } | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  const isLocked =
    lockOverride?.channelId === channel?.id
      ? (lockOverride?.value ?? false)
      : Boolean(channelData?.frozen);

  const actorId = client?.userID ?? currentUserId;
  const myMember = (channel?.state?.members ?? {})[actorId] as
    | { is_moderator?: boolean; channel_role?: string }
    | undefined;
  const canLock = canModerateChannel(
    role,
    channelData?.created_by_id,
    myMember,
    actorId,
  );

  async function handleToggleLock() {
    if (!channel?.id) return;
    const reason = isLocked
      ? undefined
      : window.prompt('Reason for locking this channel (optional):') ?? undefined;
    setIsLocking(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await setChannelLock(token, {
        channelId: channel.id,
        locked: !isLocked,
        reason,
      });
      setLockOverride({ channelId: channel.id, value: !isLocked });
      showToast(isLocked ? 'Channel unlocked.' : 'Channel locked.');
      // Refresh the channel so the read-only composer notice reflects the lock.
      await channel.watch().catch(() => undefined);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update channel lock.', 'error');
    } finally {
      setIsLocking(false);
    }
  }

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
      {canLock && (
        <button
          type="button"
          onClick={() => void handleToggleLock()}
          disabled={isLocking}
          title={isLocked ? 'Unlock channel' : 'Lock channel'}
          aria-label={isLocked ? 'Unlock channel' : 'Lock channel'}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
            isLocked
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <IconLock width={17} height={17} />
        </button>
      )}
      {onToggleSearch && (
        <button
          type="button"
          onClick={onToggleSearch}
          title={showSearch ? 'Close search' : 'Search messages'}
          aria-label={showSearch ? 'Close search' : 'Search messages'}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            showSearch
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <IconSearch width={17} height={17} />
        </button>
      )}
      <LazyCallButtons channelId={channel?.id ?? ''} kind={kind} />
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
