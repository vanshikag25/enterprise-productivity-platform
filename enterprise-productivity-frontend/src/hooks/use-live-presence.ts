import { useEffect, useState } from 'react';
import type { StreamChat } from 'stream-chat';

export interface LivePresence {
  online: boolean;
  lastActive: string | null;
  status: string | null;
}

export interface UsePresenceResult {
  presence: Map<string, LivePresence>;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 15000;

interface PresenceUserShape {
  id?: string;
  online?: boolean;
  last_active?: string;
  status?: unknown;
}

interface PresenceEvent {
  user?: PresenceUserShape;
}

interface UserUpdatedEvent {
  user?: PresenceUserShape;
}

function toLivePresence(user: PresenceUserShape): LivePresence {
  return {
    online: Boolean(user.online),
    lastActive: user.last_active ?? null,
    status: typeof user.status === 'string' ? user.status : null,
  };
}

export function usePresence(
  client: StreamChat | null,
  userIds: string[],
): UsePresenceResult {
  const [presence, setPresence] = useState<Map<string, LivePresence>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = userIds.slice().sort().join(',');

  useEffect(() => {
    if (!client || userIds.length === 0) {
      return;
    }

    let isCancelled = false;

    async function fetchPresence() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await client!.queryUsers(
          { id: { $in: userIds } },
          {},
          { presence: true },
        );

        if (isCancelled) return;

        setPresence((prev) => {
          const next = new Map(prev);
          for (const streamUser of response.users) {
            next.set(streamUser.id, toLivePresence(streamUser));
          }
          return next;
        });
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load presence.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPresence();

    const interval = setInterval(fetchPresence, POLL_INTERVAL_MS);

    function applyPresenceEvent(event: { user?: PresenceUserShape }) {
      const userId = event.user?.id;
      if (!userId || !userIds.includes(userId)) return;

      setPresence((prev) => {
        const next = new Map(prev);
        next.set(userId, toLivePresence(event.user!));
        return next;
      });
    }

    function handlePresenceChanged(event: PresenceEvent) {
      applyPresenceEvent(event);
    }

    function handleUserUpdated(event: UserUpdatedEvent) {
      applyPresenceEvent(event);
    }

    client.on('user.presence.changed', handlePresenceChanged);
    client.on('user.updated', handleUserUpdated);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      client.off('user.presence.changed', handlePresenceChanged);
      client.off('user.updated', handleUserUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);

  return { presence, isLoading, error };
}