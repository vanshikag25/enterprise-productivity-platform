'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ParticipantView,
  useBackgroundFilters,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { SfuModels, type StreamVideoParticipant } from '@stream-io/video-client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStreamChatContext } from '@/context/stream-chat-context';
import {
  IconBlur,
  IconChat,
  IconHand,
  IconMic,
  IconMicOff,
  IconPhoneOff,
  IconRecord,
  IconScreenShare,
  IconVideo,
  IconVideoOff,
} from '@/components/ui/icons';
import { useCallManager } from './call-manager-provider';
import { useRaisedHands } from './use-raised-hands';
import { CallChatPanel } from './call-chat-panel';

export function InCallScreen() {
  const { session, endCall } = useCallManager();

  if (!session) return null;
  return (
    <CallLayout
      channelId={session.channelId}
      mode={session.mode}
      backstageEnabled={session.backstageEnabled}
      onEnd={endCall}
    />
  );
}

function CallLayout({
  channelId,
  mode,
  backstageEnabled,
  onEnd,
}: {
  channelId: string;
  mode: 'voice' | 'video';
  backstageEnabled: boolean;
  onEnd: () => void;
}) {
  const call = useCall();
  const { showToast } = useToast();
  const { client: chatClient } = useStreamChatContext();

  const {
    useParticipants,
    useLocalParticipant,
    useMicrophoneState,
    useCameraState,
    useScreenShareState,
    useIsCallRecordingInProgress,
  } = useCallStateHooks();

  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const isRecording = useIsCallRecordingInProgress();
  const microphone = useMicrophoneState();
  const camera = useCameraState();
  const screenShare = useScreenShareState();

  const [showChat, setShowChat] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const raisedHands = useRaisedHands(call);

  const backgroundFilters = useBackgroundFilters();

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const sharer = useMemo(
    () =>
      participants.find((p) =>
        p.publishedTracks?.includes(SfuModels.TrackType.SCREEN_SHARE),
      ),
    [participants],
  );

  const gridParticipants = useMemo(
    () => participants.filter((p) => p !== sharer),
    [participants, sharer],
  );
  const hasScreenShare = Boolean(sharer);

  const toggleRecording = async () => {
    if (!call) return;
    try {
      if (isRecording) {
        await call.stopRecording();
        showToast('Recording stopped');
      } else {
        await call.startRecording();
        showToast('Recording started');
      }
    } catch {
      showToast('You do not have permission to record this call', 'error');
    }
  };

  const toggleBlur = () => {
    if (!backgroundFilters.isSupported || !backgroundFilters.isReady) {
      showToast('Background blur is not available on this device', 'error');
      return;
    }
    if (blurEnabled) {
      backgroundFilters.disableBackgroundFilter();
      setBlurEnabled(false);
    } else {
      backgroundFilters.applyBackgroundBlurFilter('low');
      setBlurEnabled(true);
    }
  };

  const toggleRaiseHand = () => {
    if (!call) return;
    if (handRaised) {
      void call.sendReaction({ type: 'clear-raised-hand', emoji_code: ':raise-hand:' }).catch(() => {});
      setHandRaised(false);
    } else {
      void call
        .sendReaction({ type: 'raised-hand', emoji_code: ':raise-hand:' })
        .catch(() => showToast('Could not raise your hand', 'error'));
      setHandRaised(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-slate-900/80 px-4 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {mode === 'video' ? 'Video call' : 'Voice call'}
            {backstageEnabled ? ' · Meeting' : ''}
          </p>
          <p className="truncate text-[11px] text-slate-400">{channelId}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-xs">
          {isRecording && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-red-300">
              <IconRecord width={12} height={12} className="animate-pulse" />
              REC
            </span>
          )}
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-medium tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-medium">
            {participants.length} on call
          </span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
          {hasScreenShare && sharer ? (
            <>
              <div className="mb-3 min-h-0 flex-1 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
                <ParticipantView
                  participant={sharer}
                  trackType="screenShareTrack"
                  ParticipantViewUI={null}
                  className="h-full w-full"
                />
                <ParticipantOverlay participant={sharer} raisedHands={raisedHands} />
              </div>
              <div className="mt-3 flex justify-center gap-2 overflow-x-auto">
                <ParticipantTile
                  participant={localParticipant}
                  mode={mode}
                  raisedHands={raisedHands}
                />
                {gridParticipants
                  .filter((p) => p !== sharer)
                  .map((p) => (
                    <ParticipantTile
                      key={p.userId}
                      participant={p}
                      mode={mode}
                      raisedHands={raisedHands}
                    />
                  ))}
              </div>
            </>
          ) : (
            <div className="grid h-full w-full grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <ParticipantTile
                participant={localParticipant}
                mode={mode}
                raisedHands={raisedHands}
                self
              />
              {gridParticipants.map((p) => (
                <ParticipantTile
                  key={p.userId}
                  participant={p}
                  mode={mode}
                  raisedHands={raisedHands}
                />
              ))}
            </div>
          )}
        </div>

        {showChat && (
          <CallChatPanel
            channelId={channelId}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>

      <footer className="flex h-20 shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-slate-900/80 px-4 backdrop-blur">
        <ControlButton
          label={microphone.isMute ? 'Unmute' : 'Mute'}
          active={!microphone.isMute}
          onClick={() => void call?.microphone.toggle()}
        >
          {microphone.isMute ? (
            <IconMicOff width={20} height={20} />
          ) : (
            <IconMic width={20} height={20} />
          )}
        </ControlButton>

        {mode === 'video' && (
          <>
            <ControlButton
              label={camera.isMute ? 'Turn camera on' : 'Turn camera off'}
              active={!camera.isMute}
              onClick={() => void call?.camera.toggle()}
            >
              {camera.isMute ? (
                <IconVideoOff width={20} height={20} />
              ) : (
                <IconVideo width={20} height={20} />
              )}
            </ControlButton>

            <ControlButton
              label={blurEnabled ? 'Remove blur' : 'Blur background'}
              active={blurEnabled}
              onClick={toggleBlur}
            >
              <IconBlur width={20} height={20} />
            </ControlButton>
          </>
        )}

        <ControlButton
          label={screenShare.isMute ? 'Share screen' : 'Stop sharing'}
          active={!screenShare.isMute}
          onClick={() => void call?.screenShare.toggle()}
        >
          <IconScreenShare width={20} height={20} />
        </ControlButton>

        <ControlButton
          label={handRaised ? 'Lower hand' : 'Raise hand'}
          active={handRaised}
          badge={raisedHands.length}
          onClick={toggleRaiseHand}
        >
          <IconHand width={20} height={20} />
        </ControlButton>

        <ControlButton
          label={isRecording ? 'Stop recording' : 'Record call'}
          active={isRecording}
          onClick={() => void toggleRecording()}
        >
          <IconRecord width={20} height={20} />
        </ControlButton>

        {chatClient && (
          <ControlButton
            label={showChat ? 'Hide chat' : 'Call chat'}
            active={showChat}
            onClick={() => setShowChat((v) => !v)}
          >
            <IconChat width={20} height={20} />
          </ControlButton>
        )}

        <Button
          onClick={onEnd}
          variant="danger"
          size="icon"
          className="h-12 w-12 rounded-full"
          aria-label="End call"
          title="End call"
        >
          <IconPhoneOff width={20} height={20} />
        </Button>
      </footer>
    </div>
  );
}

function ControlButton({
  label,
  active,
  badge,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute -top-2 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold">
          {badge}
        </span>
      )}
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          active
            ? 'bg-white/15 text-white hover:bg-white/25'
            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
        }`}
      >
        {children}
      </button>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

function ParticipantTile({
  participant,
  mode,
  raisedHands,
  self,
}: {
  participant: StreamVideoParticipant | undefined;
  mode: 'voice' | 'video';
  raisedHands: ReturnType<typeof useRaisedHands>;
  self?: boolean;
}) {
  if (!participant) return null;
  const isSharing = participant.publishedTracks?.includes(SfuModels.TrackType.SCREEN_SHARE);
  const raised = raisedHands.some((h) => h.userId === participant.userId);

  return (
    <div className="relative min-h-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
      {mode === 'video' && !isSharing ? (
        <ParticipantView
          participant={participant}
          trackType="videoTrack"
          ParticipantViewUI={null}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full min-h-24 w-full items-center justify-center">
          <AvatarTile name={participant.name ?? participant.userId} />
        </div>
      )}
      <ParticipantOverlay
        participant={participant}
        raisedHands={raisedHands}
        self={self}
      />
      {raised && (
        <span className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-lg">
          <IconHand width={16} height={16} />
        </span>
      )}
    </div>
  );
}

function ParticipantOverlay({
  participant,
  raisedHands,
  self,
}: {
  participant: StreamVideoParticipant | undefined;
  raisedHands: ReturnType<typeof useRaisedHands>;
  self?: boolean;
}) {
  if (!participant) return null;
  const raised = raisedHands.some((h) => h.userId === participant.userId);
  const muted =
    !(participant.publishedTracks?.includes(SfuModels.TrackType.AUDIO) ?? true) &&
    !raised;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-2 pt-8">
      <span className="truncate text-xs font-medium">
        {participant.name ?? participant.userId}
        {self ? ' (you)' : ''}
      </span>
      {muted && <IconMicOff width={14} height={14} className="shrink-0 text-red-400" />}
    </div>
  );
}

function AvatarTile({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/30 text-xl font-bold text-blue-200 ring-2 ring-white/10">
      {initials || '?'}
    </div>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

