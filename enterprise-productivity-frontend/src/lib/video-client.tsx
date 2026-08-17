'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-sdk';
import { NoiseCancellation } from '@stream-io/audio-filters-web';
import { useAuth, useUser } from '@/lib/auth';
import { fetchVideoConnect } from '@/lib/api-client';

interface VideoContextValue {
  client: StreamVideoClient | null;
  isLoading: boolean;
  error: string | null;
  noiseCancellation: NoiseCancellation | null;
}

const VideoContext = createContext<VideoContextValue>({
  client: null,
  isLoading: true,
  error: null,
  noiseCancellation: null,
});

export function useVideoContext(): VideoContextValue {
  return useContext(VideoContext);
}

export function VideoProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<StreamVideoClient | null>(null);
  const connectedUserIdRef = useRef<string | null>(null);

  const [noiseCancellation, setNoiseCancellation] =
    useState<NoiseCancellation | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function connect() {
      if (!isLoaded) return;
      if (!isSignedIn || !user) {
        setIsLoading(false);
        return;
      }

      if (connectedUserIdRef.current === user.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('Unable to retrieve session token.');

        const { apiKey, token } = await fetchVideoConnect(clerkToken);

        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user: {
            id: user.id,
            name: user.fullName ?? user.username ?? user.id,
            image: user.imageUrl ?? undefined,
          },
          token,
        });

        if (isCancelled) return;

        connectedUserIdRef.current = user.id;
        clientRef.current = videoClient;
        setClient(videoClient);
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to connect to Stream Video.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    connect();

    return () => {
      isCancelled = true;

      // A re-run for the same signed-in user must not tear down the live
      // connection (that would leave a brief disconnected window).
      if (
        isSignedIn &&
        user &&
        connectedUserIdRef.current === user.id
      ) {
        return;
      }

      const currentClient = clientRef.current;
      clientRef.current = null;
      connectedUserIdRef.current = null;
      if (currentClient) {
        void currentClient.disconnectUser();
      }
    };
  }, [isLoaded, isSignedIn, user, getToken]);

  // Lazily bootstrap noise cancellation (loads the Krisp model). Fails
  // gracefully — the rest of the call UI keeps working without it.
  useEffect(() => {
    if (!client) return;
    let disposed = false;
    let instance: NoiseCancellation | null = null;

    (async () => {
      try {
        const nc = new NoiseCancellation();
        await nc.init();
        if (disposed) {
          await nc.dispose();
          return;
        }
        instance = nc;
        setNoiseCancellation(nc);
      } catch {
        // Noise cancellation is optional — ignore bootstrap failures.
      }
    })();

    return () => {
      disposed = true;
      if (instance) {
        void instance.dispose();
      }
    };
  }, [client]);

  const value = useMemo<VideoContextValue>(
    () => ({ client, isLoading, error, noiseCancellation }),
    [client, isLoading, error, noiseCancellation],
  );

  if (!client) {
    return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
  }

  return (
    <VideoContext.Provider value={value}>
      <StreamVideo client={client}>{children}</StreamVideo>
    </VideoContext.Provider>
  );
}
