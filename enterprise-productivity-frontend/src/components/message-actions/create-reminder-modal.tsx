'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  createReminder,
  type ReminderPayload,
  type ReminderPriority,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select, Textarea } from '@/components/ui/form';
import { messageTextSnippet, type SourceMessageRef } from './source-message';

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CreateReminderFromMessageModalProps {
  open: boolean;
  onClose: () => void;
  source: SourceMessageRef;
  prefill?: Partial<ReminderPayload>;
  onCreated?: (reminder: { id: string }) => void;
}

export function CreateReminderFromMessageModal({
  open,
  onClose,
  source,
  prefill,
  onCreated,
}: CreateReminderFromMessageModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const snippet = messageTextSnippet({
    id: source.sourceMessageId ?? 'source',
    text: source.sourceMessageText,
  });
  const [title, setTitle] = useState(prefill?.title ?? snippet);
  const [scheduledFor, setScheduledFor] = useState(() =>
    prefill?.scheduledFor ??
      toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [priority, setPriority] = useState<ReminderPriority>(
    prefill?.priority ?? 'Medium',
  );
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) return setValidationError('Title is required.');
    if (!scheduledFor) return setValidationError('Date and time are required.');
    const target = new Date(scheduledFor).getTime();
    if (Number.isNaN(target)) return setValidationError('Enter a valid date and time.');
    if (target <= Date.now()) return setValidationError('Reminder time must be in the future.');

    setValidationError(null);
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const payload: ReminderPayload = {
        title: title.trim(),
        scheduledFor: new Date(scheduledFor).toISOString(),
        priority,
        notes: notes.trim() || undefined,
        sourceChannelId: source.sourceChannelId,
        sourceMessageId: source.sourceMessageId,
        sourceSenderId: source.sourceSenderId,
        sourceChannelName: source.sourceChannelName,
      };
      const reminder = await createReminder(token, payload);
      showToast('Reminder set.');
      onCreated?.({ id: reminder.id });
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to create reminder.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Reminder">
      <div className="flex flex-col gap-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" autoFocus />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
          <div className="flex-1">
            <Label>When</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
          <div className="sm:w-36">
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as ReminderPriority)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional note" />
        </div>
        {validationError && <p className="field-error">{validationError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Setting…' : 'Set reminder'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
