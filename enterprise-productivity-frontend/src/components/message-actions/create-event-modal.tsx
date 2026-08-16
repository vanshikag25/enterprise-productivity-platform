'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { createMeeting, createCreationRequest, type MeetingPayload } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { Modal } from '@/components/ui/modal';
import { MeetingForm } from '@/components/meetings/meeting-form';
import { messageTextSnippet, type SourceMessageRef } from './source-message';

interface CreateEventFromMessageModalProps {
  open: boolean;
  onClose: () => void;
  source: SourceMessageRef;
  prefill?: Partial<MeetingPayload>;
  onCreated?: (meeting: { id: string }) => void;
}

export function CreateEventFromMessageModal({
  open,
  onClose,
  source,
  prefill,
  onCreated,
}: CreateEventFromMessageModalProps) {
  const { getToken } = useAuth();
  const { can } = useRole();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: MeetingPayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');

      const sourceRefs = {
        sourceChannelId: source.sourceChannelId,
        sourceMessageId: source.sourceMessageId,
        sourceSenderId: source.sourceSenderId,
        sourceChannelName: source.sourceChannelName,
      };

      if (!can('create_meeting')) {
        const request = await createCreationRequest(token, {
          entityType: 'meeting',
          payload,
          ...sourceRefs,
          sourceMessageText: source.sourceMessageText,
        });
        showToast('Meeting request submitted — a team lead will review it.');
        onCreated?.({ id: request.id });
        onClose();
        return;
      }

      const meeting = await createMeeting(token, {
        ...payload,
        ...sourceRefs,
      });
      showToast('Meeting created from message.');
      onCreated?.({ id: meeting.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const snippet = messageTextSnippet(
    { id: source.sourceMessageId ?? 'source', text: source.sourceMessageText },
  );
  const requiresApproval = !can('create_meeting');

  return (
    <Modal open={open} onClose={onClose} title="Create Calendar Event" maxWidth="lg">
      <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        <span className="font-medium text-slate-700">From:</span>{' '}
        {source.sourceChannelName ? `${source.sourceChannelName} — ` : ''}
        {snippet}
      </div>
      {requiresApproval && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Your meeting will be sent to a team lead for approval before it is
          scheduled.
        </div>
      )}
      <MeetingForm
        initial={{
          title: prefill?.title ?? snippet,
          description:
            prefill?.description ??
            `Created from a message in ${source.sourceChannelName ?? 'chat'}.`,
          ...(prefill?.scheduledDate ? { scheduledDate: prefill.scheduledDate } : {}),
          ...(prefill?.startTime ? { startTime: prefill.startTime } : {}),
          ...(prefill?.endTime ? { endTime: prefill.endTime } : {}),
        }}
        isSubmitting={isSubmitting}
        error={error}
        submitLabel={requiresApproval ? 'Submit for approval' : 'Create event'}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
