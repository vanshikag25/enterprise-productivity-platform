'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createMeeting, type MeetingPayload } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Modal } from '@/components/ui/modal';
import { MeetingForm } from '@/components/meetings/meeting-form';
import { messageTextSnippet, type SourceMessageRef } from './source-message';

interface CreateEventFromMessageModalProps {
  open: boolean;
  onClose: () => void;
  source: SourceMessageRef;
}

export function CreateEventFromMessageModal({
  open,
  onClose,
  source,
}: CreateEventFromMessageModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: MeetingPayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await createMeeting(token, {
        ...payload,
        sourceChannelId: source.sourceChannelId,
        sourceMessageId: source.sourceMessageId,
        sourceSenderId: source.sourceSenderId,
        sourceChannelName: source.sourceChannelName,
      });
      showToast('Meeting created from message.');
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

  return (
    <Modal open={open} onClose={onClose} title="Create Calendar Event" maxWidth="lg">
      <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        <span className="font-medium text-slate-700">From:</span>{' '}
        {source.sourceChannelName ? `${source.sourceChannelName} — ` : ''}
        {snippet}
      </div>
      <MeetingForm
        initial={{
          title: snippet,
          description: `Created from a message in ${source.sourceChannelName ?? 'chat'}.`,
        }}
        isSubmitting={isSubmitting}
        error={error}
        submitLabel="Create event"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
