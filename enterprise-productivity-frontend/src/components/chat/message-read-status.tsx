'use client';

import {
  useMessageContext,
  useChannelStateContext,
  useChatContext,
} from 'stream-chat-react';
import { formatLastSeen } from '@/lib/format-date';

export function MessageReadStatus() {
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();

  const currentUserId = client?.userID;
  const isOwnMessage = message.user?.id === currentUserId;

  if (!isOwnMessage) {
    return null;
  }

  if (message.status !== 'received') {
    return null;
  }

  const readState = channel?.state?.read ?? {};
  const messageCreatedAt = message.created_at
    ? new Date(message.created_at as unknown as string)
    : null;

  const readers = Object.values(readState).filter((entry) => {
    if (!entry.user || entry.user.id === currentUserId) return false;
    if (!entry.last_read) return false;
    if (!messageCreatedAt) return true;
    return new Date(entry.last_read) >= messageCreatedAt;
  });

  if (readers.length > 0) {
    const latest = readers.reduce((latestEntry, entry) =>
      new Date(entry.last_read) > new Date(latestEntry.last_read)
        ? entry
        : latestEntry,
    );

    const names = readers
      .map((r) => r.user?.name || r.user?.id)
      .filter((name): name is string => Boolean(name));

    const label =
      names.length === 1
        ? `Read by ${names[0]}`
        : names.length <= 3
          ? `Read by ${names.join(', ')}`
          : `Read by ${names.length} people`;

    return (
      <span
        className="ml-1 inline-flex items-center text-[11px] font-medium text-blue-500"
        title={`${label} · ${formatLastSeen(latest.last_read)}`}
        aria-label={label}
      >
        ✓✓
      </span>
    );
  }

  return (
    <span
      className="ml-1 inline-flex items-center text-[11px] text-gray-400"
      title="Sent"
      aria-label="Sent"
    >
      ✓
    </span>
  );
}
