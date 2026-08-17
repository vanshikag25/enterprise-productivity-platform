'use client';

import { CallingState, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  IconHand,
  IconPhone,
  IconPhoneOff,
  IconVideo,
} from '@/components/ui/icons';
import { useCallManager } from './call-manager-provider';
import { InCallScreen } from './in-call-screen';

export function CallOverlay() {
  const { session, acceptCall, declineCall, cancelCall, endCall, startLive } =
    useCallManager();
  const { useCallCallingState, useIsCallLive } = useCallStateHooks();
  const callingState = useCallCallingState();
  const isLive = useIsCallLive();

  if (!session) return null;

  const { mode, direction, backstageEnabled, callerName } = session;

  const isRinging =
    callingState === CallingState.RINGING ||
    callingState === CallingState.UNKNOWN ||
    callingState === CallingState.IDLE;

  if (direction === 'incoming' && isRinging) {
    return (
      <IncomingCallCard name={callerName ?? 'Incoming call'} mode={mode} onAccept={acceptCall} onDecline={declineCall} />
    );
  }

  if (direction === 'outgoing' && isRinging) {
    return <OutgoingCallCard mode={mode} onCancel={cancelCall} />;
  }

  if (
    (callingState === CallingState.JOINING ||
      callingState === CallingState.RECONNECTING) &&
    !isLive
  ) {
    return <ConnectingScreen />;
  }

  if (
    callingState === CallingState.JOINED &&
    backstageEnabled &&
    !isLive
  ) {
    return (
      <CallWaitingRoom
        isHost={direction === 'outgoing'}
        onStart={startLive}
        onLeave={endCall}
      />
    );
  }

  if (
    callingState === CallingState.JOINED ||
    callingState === CallingState.RECONNECTING
  ) {
    return <InCallScreen />;
  }

  return null;
}

function IncomingCallCard({
  name,
  mode,
  onAccept,
  onDecline,
}: {
  name: string;
  mode: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          {mode === 'video' ? (
            <IconVideo width={34} height={34} />
          ) : (
            <IconPhone width={30} height={30} />
          )}
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          {name}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Incoming {mode === 'video' ? 'video call' : 'voice call'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            onClick={onDecline}
            variant="danger"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Decline call"
            title="Decline"
          >
            <IconPhoneOff width={22} height={22} />
          </Button>
          <Button
            onClick={onAccept}
            variant="success"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Accept call"
            title="Accept"
          >
            <IconPhone width={22} height={22} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function OutgoingCallCard({
  mode,
  onCancel,
}: {
  mode: 'voice' | 'video';
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          {mode === 'video' ? (
            <IconVideo width={34} height={34} />
          ) : (
            <IconPhone width={30} height={30} />
          )}
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          Calling…
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Waiting for the other participant to join
        </p>
        <div className="mt-6 flex items-center justify-center">
          <Button
            onClick={onCancel}
            variant="danger"
            size="icon"
            className="h-14 w-14 rounded-full"
            aria-label="Cancel call"
            title="Cancel"
          >
            <IconPhoneOff width={22} height={22} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConnectingScreen() {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-slate-900/70 p-4 backdrop-blur-sm">
      <Spinner className="h-10 w-10 text-blue-500" />
      <p className="text-sm font-medium text-slate-200">Connecting…</p>
    </div>
  );
}

function CallWaitingRoom({
  isHost,
  onStart,
  onLeave,
}: {
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <IconHand width={30} height={30} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          {isHost ? 'Meeting waiting room' : 'In the waiting room'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isHost
            ? 'You are in the meeting. Start it when everyone is ready.'
            : 'The host will start the meeting shortly.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={onLeave} variant="outline">
            Leave
          </Button>
          {isHost && (
            <Button onClick={onStart} variant="success">
              Start meeting
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
