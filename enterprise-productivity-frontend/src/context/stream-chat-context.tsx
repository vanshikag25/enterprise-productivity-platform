'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { StreamChat } from 'stream-chat';
import { fetchChatToken, createSelfNotification } from '@/lib/api-client';
import { showBrowserNotification } from '@/hooks/use-browser-notifications';

interface StreamChatContextValue {
  client: StreamChat | null;
  isLoading: boolean;
  error: string | null;
}

const StreamChatContext = createContext<StreamChatContextValue>({
  client: null,
  isLoading: true,
  error: null,
});

export function useStreamChatContext(): StreamChatContextValue {
  return useContext(StreamChatContext);
}

export function StreamChatProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [client, setClient] = useState<StreamChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<StreamChat | null>(null);
  const connectedUserIdRef = useRef<string | null>(null);
  const connectGeneration = useRef(0);
  const messageListenerRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const generation = ++connectGeneration.current;

    async function connect() {
      if (!isLoaded) return;
      if (!isSignedIn || !user) {
        if (generation === connectGeneration.current) setIsLoading(false);
        return;
      }

      // Already connected as this user — keep the existing connection alive.
      if (connectedUserIdRef.current === user.id) {
        if (generation === connectGeneration.current) setIsLoading(false);
        return;
      }

      if (generation === connectGeneration.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('Unable to retrieve Clerk session token.');

        const { streamToken, apiKey } = await fetchChatToken(clerkToken);
        const chatClient = StreamChat.getInstance(apiKey);

        await chatClient.connectUser(
          { id: user.id, name: user.fullName ?? user.username ?? user.id, image: user.imageUrl },
          streamToken,
        );

        if (isCancelled || generation !== connectGeneration.current) {
          // A newer effect run owns the singleton now; leave it connected.
          return;
        }

        // Chat-driven notifications: detected client-side via this user's own socket.
        const messageListener = chatClient.on('message.new', async (event) => {
          const message = event.message;
          if (!message || message.user?.id === chatClient.userID) return;

          const channelData = (event.channel as unknown as { channel_kind?: string; name?: string } | undefined);
          const isMentioned = message.mentioned_users?.some((u) => u.id === chatClient.userID);
          const kind = channelData?.channel_kind;

          let type = 'group_message';
          let title = 'New message';
          if (isMentioned) {
            type = 'mention';
            title = `You were mentioned`;
          } else if (kind === 'announcement') {
            type = 'announcement';
            title = 'New announcement';
          } else {
            const memberCount = event.channel?.member_count ?? 0;
            type = memberCount <= 2 ? 'direct_message' : 'group_message';
            title = memberCount <= 2 ? 'New direct message' : 'New group message';
          }

          const senderName = message.user?.name ?? 'Someone';
          const description = message.text ? `${senderName}: ${message.text}` : senderName;

          try {
            const token = await getToken();
            if (!token) return;
            await createSelfNotification(token, {
              type,
              title,
              description: description.slice(0, 200),
              actionUrl: `/dashboard?channel=${event.channel_id}`,
            });
          } catch {
            // Non-critical — skip silently if backend is briefly unreachable.
          }

          showBrowserNotification(title, description);
        });

        messageListenerRef.current = messageListener;
        connectedUserIdRef.current = chatClient.userID ?? user.id;
        clientRef.current = chatClient;
        setClient(chatClient);
      } catch (err) {
        if (!isCancelled && generation === connectGeneration.current) {
          setError(err instanceof Error ? err.message : 'Failed to connect to Stream Chat.');
        }
      } finally {
        if (!isCancelled && generation === connectGeneration.current) {
          setIsLoading(false);
        }
      }
    }

    connect();

    return () => {
      isCancelled = true;

      if (generation === connectGeneration.current) {
        // Effect re-runs for the same signed-in user must not tear down the
        // live connection (that would leave a brief disconnected window).
        if (
          isSignedIn &&
          user &&
          connectedUserIdRef.current === user.id
        ) {
          return;
        }

        messageListenerRef.current?.unsubscribe();
        messageListenerRef.current = null;

        const currentClient = clientRef.current;
        clientRef.current = null;
        connectedUserIdRef.current = null;
        if (currentClient) {
          void currentClient.disconnectUser();
        }
      }
    };
  }, [isLoaded, isSignedIn, user, getToken]);

  return (
    <StreamChatContext.Provider value={{ client, isLoading, error }}>
      {children}
    </StreamChatContext.Provider>
  );
}
