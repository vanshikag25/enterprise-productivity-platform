'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchMeetings,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  leaveMeeting,
  updateMeetingStatus,
  type MeetingItem,
  type MeetingPayload,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useCallManager } from '@/components/calls/call-manager-provider';
import { useTaskDirectory } from '@/hooks/use-task-directory';
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { IconClose, IconMessageCircle } from '@/components/ui/icons';
import { MeetingForm } from '@/components/meetings/meeting-form';
import { useWorkspace } from './workspace-context';

const STATUS_VARIANT: Record<string, 'blue' | 'amber' | 'green' | 'red'> = {
  Scheduled: 'blue',
  Ongoing: 'amber',
  Completed: 'green',
  Cancelled: 'red',
};

export function MeetingWorkspace({ meetingId }: { meetingId: string }) {
  const { getToken, userId } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { endCall, joinMeetingCall, isStarting: isJoiningCall } = useCallManager();
  const { nameById, users } = useTaskDirectory();
  const { can } = useRole();
  const { setMode } = useWorkspace();

  const [meeting, setMeeting] = useState<MeetingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      setMeeting(null);
      setIsEditing(false);

      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const all = await fetchMeetings(token);
        const found = all.find((m) => m.id === meetingId);
        if (!cancelled) {
          if (found) setMeeting(found);
          else setError('Meeting not found.');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load meeting.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meetingId, getToken]);

  const handleEditSubmit = useCallback(
    async (payload: MeetingPayload) => {
      if (!meeting) return;
      setIsBusy(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const updated = await updateMeeting(token, meeting.id, payload);
        setMeeting(updated);
        showToast('Meeting updated.');
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update meeting.');
      } finally {
        setIsBusy(false);
      }
    },
    [meeting, getToken, showToast],
  );

  const handleDelete = useCallback(async () => {
    if (!meeting) return;
    if (!window.confirm('Delete this meeting? This cannot be undone.')) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteMeeting(token, meeting.id);
      showToast('Meeting deleted.');
      setMode(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }, [meeting, getToken, showToast, setMode]);

  const handleJoin = useCallback(async () => {
    if (!meeting) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await joinMeeting(token, meeting.id);
      setMeeting(updated);
      if (meeting.meetingChatChannelId) {
        await joinMeetingCall({
          channelId: meeting.meetingChatChannelId,
          meetingId: meeting.id,
          mode: 'video',
        });
        showToast('Joined meeting and video call started.');
      } else {
        showToast('Joined meeting.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to join meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }, [meeting, getToken, showToast, joinMeetingCall]);

  const handleEndMeeting = useCallback(async () => {
    if (!meeting) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateMeetingStatus(token, meeting.id, 'Completed');
      setMeeting(updated);
      await endCall();
      showToast('Meeting ended.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to end meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }, [meeting, getToken, showToast, endCall]);

  const handleLeave = useCallback(async () => {
    if (!meeting) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await leaveMeeting(token, meeting.id);
      setMeeting(updated);
      showToast('Left meeting.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to leave meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }, [meeting, getToken, showToast]);

  const handleOpenChat = useCallback(() => {
    if (meeting?.meetingChatChannelId) {
      router.push(`/dashboard?channel=${meeting.meetingChatChannelId}`);
    }
  }, [meeting, router]);

  const handleCopyLink = useCallback(() => {
    if (!meeting) return;
    const url = `${window.location.origin}${meeting.meetingUrl ?? `/meet/${meeting.meetingCode ?? meeting.id}`}`;
    void navigator.clipboard.writeText(url);
    showToast('Meeting link copied.');
  }, [meeting, showToast]);

  const canJoinMeeting = meeting ? ['Scheduled', 'Ongoing'].includes(meeting.meetingStatus) : false;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <SkeletonCard className="h-14" />
        <SkeletonCard className="h-48" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message={error ?? 'Meeting not found.'} />
      </div>
    );
  }

  const isOrganizer = userId === meeting.organizerId;
  const isParticipant = userId ? meeting.participants.includes(userId) : false;
  const participantUsers = users.filter((u) => meeting.participants.includes(u.id));

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <Badge variant={STATUS_VARIANT[meeting.meetingStatus] ?? 'gray'}>{meeting.meetingStatus}</Badge>
        <button
          onClick={() => setMode(null)}
          aria-label="Close meeting"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <IconClose width={18} height={18} />
        </button>
      </div>

      <div className="flex-1 p-5">
        {isEditing ? (
          <MeetingForm
            initial={{ title: meeting.title, description: meeting.description ?? '', scheduledDate: meeting.scheduledDate, startTime: meeting.startTime, endTime: meeting.endTime }}
            initialParticipants={participantUsers}
            isSubmitting={isBusy}
            error={error}
            submitLabel="Save"
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{meeting.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {meeting.description || 'No description.'}
            </p>

            {meeting.agenda && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">Agenda</p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{meeting.agenda}</p>
              </div>
            )}

            <dl className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Organizer</dt>
                <dd className="text-slate-800">{nameById(meeting.organizerId)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</dt>
                <dd className="text-slate-800">{new Date(meeting.scheduledDate).toLocaleDateString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Time</dt>
                <dd className="text-slate-800">{meeting.startTime} – {meeting.endTime}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Participants</dt>
                <dd className="max-w-[60%] text-right text-slate-800">
                  {participantUsers.map((p) => p.name).join(', ') || `${meeting.participants.length} participant(s)`}
                </dd>
              </div>
            </dl>

            {(meeting.notes || meeting.recordingLink || meeting.attachments.length > 0) && (
              <div className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
                {meeting.notes && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</p>
                    <p className="whitespace-pre-wrap text-slate-700">{meeting.notes}</p>
                  </div>
                )}
                {meeting.attachments.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Documents</p>
                    <ul className="list-disc space-y-1 pl-5 text-slate-700">
                      {meeting.attachments.map((attachment) => (
                        <li key={attachment}>{attachment}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {meeting.recordingLink && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Recording</p>
                    <a href={meeting.recordingLink} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">{meeting.recordingLink}</a>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {meeting.meetingUrl && (
                <Button variant="outline" onClick={handleCopyLink}>Copy Link</Button>
              )}
              {canJoinMeeting && (
                <Button variant="success" onClick={handleJoin} disabled={isBusy || isJoiningCall}>
                  {isJoiningCall ? 'Joining…' : 'Join Now'}
                </Button>
              )}
              {isParticipant && !isOrganizer && (
                <Button variant="outline" onClick={handleLeave} disabled={isBusy}>Leave</Button>
              )}
              {meeting.meetingChatChannelId && (
                <Button onClick={handleOpenChat}>
                  <IconMessageCircle width={16} height={16} />
                  Meeting Chat
                </Button>
              )}
              {isOrganizer && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
              {isOrganizer && (
                <Button variant="danger" onClick={handleEndMeeting} disabled={isBusy}>
                  End Meeting
                </Button>
              )}
              {isOrganizer && can('create_meeting') && (
                <Button variant="ghost" onClick={handleDelete} disabled={isBusy} className="text-red-600 hover:bg-red-50">
                  Delete
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}