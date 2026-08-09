'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Channel as StreamChannel } from 'stream-chat';
import {
  fetchUsersDirectory,
  createDirectChannel,
  type UserDirectoryItem,
} from '@/lib/api-client';
import { useStreamChatContext } from '@/context/stream-chat-context';

interface UserListProps {
  onChannelReady: (channel: StreamChannel) => void;
}

export function UserList({ onChannelReady }: UserListProps) {
  const { getToken } = useAuth();
  const { client } = useStreamChatContext();

  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Unable to retrieve Clerk session token.');
        }

        const result = await fetchUsersDirectory(token, { limit: 50 });

        if (!isCancelled) {
          setUsers(result.users);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load users.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [getToken]);

  async function handleUserClick(targetUserId: string) {
    if (!client) {
      setError('Chat client is not connected yet.');
      return;
    }

    setConnectingUserId(targetUserId);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Unable to retrieve Clerk session token.');
      }

      const { channelId } = await createDirectChannel(token, targetUserId);

      const channel = client.channel('messaging', channelId);
      await channel.watch();

      onChannelReady(channel);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start conversation.',
      );
    } finally {
      setConnectingUserId(null);
    }
  }

  if (isLoading) {
    return <p className="p-3 text-sm text-gray-400">Loading users…</p>;
  }

  if (error) {
    return <p className="p-3 text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="border-b">
      <h2 className="px-3 pt-3 text-xs font-semibold uppercase text-gray-400">
        Start a conversation
      </h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <button
              onClick={() => handleUserClick(user.id)}
              disabled={connectingUserId === user.id}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <span>{user.name}</span>
              {connectingUserId === user.id && (
                <span className="text-xs text-gray-400">Connecting…</span>
              )}
            </button>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-400">
            No other users found.
          </li>
        )}
      </ul>
    </div>
  );
}
