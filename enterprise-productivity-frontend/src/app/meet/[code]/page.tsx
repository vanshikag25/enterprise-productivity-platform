'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCallManager } from '@/components/calls/call-manager-provider';
import { useAuth } from '@/lib/auth';
import { fetchMeetingByCode, joinMeeting, type MeetingItem } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export default function MeetingJoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { joinMeetingCall } = useCallManager();
  const { showToast } = useToast();

  const [meeting, setMeeting] = useState<MeetingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetingCode = useMemo(() => (params?.code ?? '').trim().toUpperCase(), [params?.code]);

  useEffect(() => {
    if (!meetingCode) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const result = await fetchMeetingByCode(token, meetingCode);
        if (!cancelled) setMeeting(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Meeting not found.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meetingCode, getToken]);

  async function handleJoin() {
    if (!meeting) return;
    setIsJoining(true);
    setError(null);

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
        showToast('Meeting opened in the video call.');
        return;
      }

      showToast('Joined meeting.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join the meeting.');
    } finally {
      setIsJoining(false);
    }
  }

  if (!meetingCode) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Meeting unavailable</p>
          <p className="mt-2 text-sm text-slate-500">Meeting code is missing.</p>
          <Button className="mt-5" onClick={() => router.push('/meetings')}>Back to meetings</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <Spinner className="h-5 w-5 text-blue-500" />
        <span>Loading meeting…</span>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Meeting unavailable</p>
          <p className="mt-2 text-sm text-slate-500">{error ?? 'This meeting code could not be found.'}</p>
          <Button className="mt-5" onClick={() => router.push('/meetings')}>Back to meetings</Button>
        </div>
      </div>
    );
  }

  const isParticipant = Boolean(userId && meeting.participants.includes(userId));

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Meeting code {meetingCode}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{meeting.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{meeting.description || 'No description provided.'}</p>
        <dl className="mt-5 space-y-2 text-sm text-slate-700">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Date</dt><dd>{new Date(meeting.scheduledDate).toLocaleDateString()}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Time</dt><dd>{meeting.startTime} – {meeting.endTime}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd>{meeting.meetingStatus}</dd></div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {meeting.meetingStatus !== 'Completed' && meeting.meetingStatus !== 'Cancelled' && (
            <Button onClick={handleJoin} disabled={isJoining || isParticipant} className="min-w-[170px]">
              {isJoining ? 'Joining…' : isParticipant ? 'Joined' : 'Join Now'}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/meetings')}>View all meetings</Button>
        </div>
      </div>
    </div>
  );
}
