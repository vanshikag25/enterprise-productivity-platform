import { useEffect, useState } from 'react';
import type { StreamChat } from 'stream-chat';

export interface LivePresence {
  online: boolean;
  lastActive: string | null;
}

export interface UsePresenceResult {
  presence: Map<string, LivePresence>;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 15000;

interface PresenceChangedEvent {
  user?: {
    id?: string;
    online?: boolean;
    last_active?: string;
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
            next.set(streamUser.id, {
              online: Boolean(streamUser.online),
              lastActive: streamUser.last_active ?? null,
            });
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

    function handlePresenceChanged(event: PresenceChangedEvent) {
      const userId = event.user?.id;
      if (!userId || !userIds.includes(userId)) return;

      setPresence((prev) => {
        const next = new Map(prev);
        next.set(userId, {
          online: Boolean(event.user?.online),
          lastActive: event.user?.last_active ?? null,
        });
        return next;
      });
    }

    client.on('user.presence.changed', handlePresenceChanged);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      client.off('user.presence.changed', handlePresenceChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);

  return { presence, isLoading, error };
}
