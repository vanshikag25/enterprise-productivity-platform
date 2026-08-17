'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Call,
  CallingState,
  StreamCall,
  useStreamVideoClient,
  BackgroundFiltersProvider,
  NoiseCancellationProvider,
} from '@stream-io/video-react-sdk';
import type { CallResponse } from '@stream-io/video-client';
import { useAuth, useUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { fetchVideoToken } from '@/lib/api-client';
import { useVideoContext } from '@/lib/video-client';
import { CallOverlay } from './call-overlay';

export interface CallSession {
  call: Call;
  channelId: string;
  mode: 'voice' | 'video';
  direction: 'outgoing' | 'incoming';
  /** True when the call runs in backstage mode (host must start it). */
  backstageEnabled: boolean;
  callerName: string | null;
}

interface CallManagerValue {
  session: CallSession | null;
  isStarting: boolean;
  startCall: (opts: {
    channelId: string;
    kind: 'dm' | 'group';
    mode: 'voice' | 'video';
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  cancelCall: () => Promise<void>;
  endCall: () => Promise<void>;
  startLive: () => Promise<void>;
}

const CallManagerContext = createContext<CallManagerValue>({
  session: null,
  isStarting: false,
  startCall: async () => {},
  acceptCall: async () => {},
  declineCall: async () => {},
  cancelCall: async () => {},
  endCall: async () => {},
  startLive: async () => {},
});

export function useCallManager(): CallManagerValue {
  return useContext(CallManagerContext);
}

function inferMode(custom: CallResponse['custom'] | undefined): 'voice' | 'video' {
  const callMode = (custom ?? {}) as { callMode?: 'voice' | 'video' };
  return callMode.callMode === 'voice' ? 'voice' : 'video';
}

export function CallManagerProvider({ children }: { children: ReactNode }) {
  const videoClient = useStreamVideoClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { showToast } = useToast();
  const { noiseCancellation } = useVideoContext();

  const [session, setSession] = useState<CallSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const sessionRef = useRef<CallSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearSession = useCallback(() => setSession(null), []);

  const notify = useCallback(
    (text: string, type: 'error' | 'info' = 'info') => showToast(text, type),
    [showToast],
  );

  // --- Outgoing call --------------------------------------------------------
  const startCall = useCallback(
    async (opts: { channelId: string; kind: 'dm' | 'group'; mode: 'voice' | 'video' }) => {
      if (sessionRef.current || !videoClient) return;
      setIsStarting(true);
      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('Unable to retrieve session token.');

        const { memberIds } = await fetchVideoToken(clerkToken, {
          channelId: opts.channelId,
          kind: opts.kind,
        });

        const call = videoClient.call('default', opts.channelId);
        await call.getOrCreate({
          data: {
            members: memberIds.map((user_id) => ({ user_id, role: 'call_member' })),
            settings_override: {
              backstage: { enabled: opts.kind === 'group' },
            },
            custom: { callMode: opts.mode },
          },
          notify: true,
          video: opts.mode === 'video',
        });

        if (opts.mode === 'voice') {
          await call.camera.disable();
        }

        await call.ring({
          members_ids: memberIds.filter((id) => id !== user?.id),
          video: opts.mode === 'video',
        });

        setSession({
          call,
          channelId: opts.channelId,
          mode: opts.mode,
          direction: 'outgoing',
          backstageEnabled: opts.kind === 'group',
          callerName: null,
        });
      } catch (err) {
        notify(
          err instanceof Error ? err.message : 'Could not start the call.',
          'error',
        );
      } finally {
        setIsStarting(false);
      }
    },
    [videoClient, getToken, notify, user],
  );

  const acceptCall = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      if (current.mode === 'voice') {
        await current.call.camera.disable();
      }
      await current.call.accept();
      await current.call.join();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Could not join the call.',
        'error',
      );
    }
  }, [notify]);

  const declineCall = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await current.call.leave({ reject: true, reason: 'declined' });
    } catch {
      // Ignore — the session is cleared regardless.
    }
    clearSession();
  }, [clearSession]);

  const cancelCall = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await current.call.leave({ reject: true, reason: 'cancel' });
    } catch {
      // Ignore.
    }
    clearSession();
  }, [clearSession]);

  const endCall = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await current.call.leave();
    } catch {
      // Ignore.
    }
    clearSession();
  }, [clearSession]);

  const startLive = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await current.call.goLive();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Could not start the meeting.',
        'error',
      );
    }
  }, [notify]);

  // --- Incoming call detection ---------------------------------------------
  useEffect(() => {
    if (!videoClient) return;
    const unsubscribers: Array<() => void> = [];

    const handleIncoming = async (response: CallResponse) => {
      const type = response.type ?? 'default';
      const id = response.id;
      if (!id) return;

      // Ignore the ring notification broadcast back to the caller.
      if (response.created_by?.id === user?.id) return;

      const busy = sessionRef.current;
      const call = videoClient.call(type, id);

      try {
        if (busy) {
          await call.leave({ reject: true, reason: 'busy' });
          return;
        }
        await call.get();

        const isVoice = inferMode(response.custom) === 'voice';
        if (isVoice) {
          await call.camera.disable();
        }

        setSession({
          call,
          channelId: id,
          mode: inferMode(response.custom),
          direction: 'incoming',
          backstageEnabled: response.backstage === true,
          callerName:
            response.created_by?.name ?? response.created_by?.id ?? 'Someone',
        });
      } catch {
        // The call may no longer exist — nothing to show.
      }
    };

    unsubscribers.push(
      videoClient.on('call.ring', (event) => {
        void handleIncoming(event.call);
      }),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [videoClient, user]);

  // --- Per-call lifecycle listeners ----------------------------------------
  useEffect(() => {
    if (!session) return;
    const { call } = session;
    const unsubscribers: Array<() => void> = [];

    const maybeJoin = () => {
      const callingState = call.state?.callingState;
      if (
        callingState &&
        callingState !== CallingState.JOINED &&
        callingState !== CallingState.JOINING &&
        callingState !== CallingState.LEFT &&
        callingState !== CallingState.OFFLINE
      ) {
        void call.join().catch(() => {});
      }
    };

    // Outgoing: join as soon as the other side accepts the ring.
    unsubscribers.push(call.on('call.accepted', maybeJoin));
    // Safety net: if a participant started the session, make sure we join.
    unsubscribers.push(call.on('call.session_started', maybeJoin));

    unsubscribers.push(
      call.on('call.session_ended', () => {
        clearSession();
        notify('Call ended');
      }),
    );
    unsubscribers.push(
      call.on('call.ended', () => {
        clearSession();
      }),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [session, clearSession, notify]);

  const value = useMemo<CallManagerValue>(
    () => ({
      session,
      isStarting,
      startCall,
      acceptCall,
      declineCall,
      cancelCall,
      endCall,
      startLive,
    }),
    [
      session,
      isStarting,
      startCall,
      acceptCall,
      declineCall,
      cancelCall,
      endCall,
      startLive,
    ],
  );

  return (
    <CallManagerContext.Provider value={value}>
      {children}
      {session && (
        <StreamCall call={session.call}>
          <BackgroundFiltersProvider backgroundBlurLevel="low">
            {noiseCancellation ? (
              <NoiseCancellationProvider noiseCancellation={noiseCancellation}>
                <CallOverlay />
              </NoiseCancellationProvider>
            ) : (
              <CallOverlay />
            )}
          </BackgroundFiltersProvider>
        </StreamCall>
      )}
    </CallManagerContext.Provider>
  );
}
