'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  createReminder,
  updateReminder,
  type ReminderItem,
  type ReminderPayload,
  type ReminderPriority,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select, Textarea } from '@/components/ui/form';

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface ReminderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  reminder?: ReminderItem | null;
}

export function ReminderFormModal({
  open,
  onClose,
  onSaved,
  reminder,
}: ReminderFormModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [scheduledFor, setScheduledFor] = useState(() =>
    reminder
      ? toLocalDateTimeValue(new Date(reminder.scheduledFor))
      : toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [priority, setPriority] = useState<ReminderPriority>(reminder?.priority ?? 'Medium');
  const [notes, setNotes] = useState(reminder?.notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEditing = Boolean(reminder);

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
      };
      if (isEditing && reminder) {
        await updateReminder(token, reminder.id, payload);
        showToast('Reminder updated.');
      } else {
        await createReminder(token, payload);
        showToast('Reminder set.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save reminder.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Reminder' : 'Create Reminder'}>
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
            {isSubmitting ? (isEditing ? 'Saving…' : 'Setting…') : isEditing ? 'Save changes' : 'Set reminder'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
