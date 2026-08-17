'use client';

import { useVideoContext } from '@/lib/video-client';
import { useCallManager } from './call-manager-provider';
import { useRole } from '@/hooks/use-role';
import { IconPhone, IconVideo } from '@/components/ui/icons';

interface CallButtonsProps {
  channelId: string;
  kind: 'dm' | 'group';
}

/**
 * Start voice/video calls from the chat header.
 * - Direct messages: voice and video calls for the two members.
 * - Group chats: a video meeting, gated behind the `create_meeting`
 *   permission (Team Lead and above) — mirroring the backend check.
 */
export function CallButtons({ channelId, kind }: CallButtonsProps) {
  const { client: videoClient } = useVideoContext();
  const { session, isStarting, startCall } = useCallManager();
  const { can } = useRole();

  if (!videoClient) return null;

  const busy = Boolean(session) || isStarting;
  const isMeeting = kind === 'group';

  if (isMeeting && !can('create_meeting')) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {!isMeeting && (
        <button
          onClick={() => void startCall({ channelId, kind, mode: 'voice' })}
          disabled={busy}
          title="Start voice call"
          aria-label="Start voice call"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconPhone width={18} height={18} />
        </button>
      )}
      <button
        onClick={() => void startCall({ channelId, kind, mode: 'video' })}
        disabled={busy}
        title={isMeeting ? 'Start meeting' : 'Start video call'}
        aria-label={isMeeting ? 'Start meeting' : 'Start video call'}
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconVideo width={19} height={19} />
      </button>
    </div>
  );
}
