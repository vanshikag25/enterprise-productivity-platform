'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { updateMeeting, deleteMeeting, joinMeeting, leaveMeeting, type MeetingItem, type MeetingPayload } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useTaskDirectory } from '@/hooks/use-task-directory';
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconClose, IconEdit, IconMessageCircle, IconTrash } from '@/components/ui/icons';
import { MeetingForm } from './meeting-form';

interface MeetingDetailDrawerProps {
  meeting: MeetingItem;
  currentUserId: string | null | undefined;
  onClose: () => void;
  onUpdated: (m: MeetingItem) => void;
  onDeleted: (id: string) => void;
}

const STATUS_VARIANT: Record<string, 'blue' | 'amber' | 'green' | 'red'> = {
  Scheduled: 'blue',
  Ongoing: 'amber',
  Completed: 'green',
  Cancelled: 'red',
};

export function MeetingDetailDrawer({ meeting, currentUserId, onClose, onUpdated, onDeleted }: MeetingDetailDrawerProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { nameById, users } = useTaskDirectory();
  const { can } = useRole();

  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrganizer = currentUserId === meeting.organizerId;
  const isParticipant = currentUserId ? meeting.participants.includes(currentUserId) : false;

  async function handleEditSubmit(payload: MeetingPayload) {
    setIsBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateMeeting(token, meeting.id, payload);
      onUpdated(updated);
      showToast('Meeting updated.');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this meeting? This cannot be undone.')) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteMeeting(token, meeting.id);
      showToast('Meeting deleted.');
      onDeleted(meeting.id);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleJoin() {
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await joinMeeting(token, meeting.id);
      onUpdated(updated);
      showToast('Joined meeting.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to join meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLeave() {
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await leaveMeeting(token, meeting.id);
      onUpdated(updated);
      showToast('Left meeting.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to leave meeting.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  function handleOpenChat() {
    if (meeting.meetingChatChannelId) router.push(`/dashboard?channel=${meeting.meetingChatChannelId}`);
  }

  const participantUsers = users.filter((u) => meeting.participants.includes(u.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-slate-900">Meeting details</h2>
          <button onClick={onClose} aria-label="Close" className="btn-icon btn-ghost rounded-lg text-slate-400 hover:text-slate-600">
            <IconClose width={18} height={18} />
          </button>
        </div>

        <div className="p-5">
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
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">{meeting.title}</h3>
              <div className="mt-2">
                <Badge variant={STATUS_VARIANT[meeting.meetingStatus] ?? 'gray'}>{meeting.meetingStatus}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{meeting.description || 'No description.'}</p>

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

              <div className="mt-6 flex flex-wrap gap-2">
                {!isParticipant && !isOrganizer && (
                  <Button variant="success" onClick={handleJoin} disabled={isBusy}>Join</Button>
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
                    <IconEdit width={15} height={15} />
                    Edit
                  </Button>
                )}
                {isOrganizer && can('create_meeting') && (
                  <Button variant="ghost" onClick={handleDelete} disabled={isBusy} className="text-red-600 hover:bg-red-50">
                    <IconTrash width={16} height={16} />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
