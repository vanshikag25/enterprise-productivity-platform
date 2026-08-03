'use client';

import { useState } from 'react';
import type { MeetingPayload, UserDirectoryItem } from '@/lib/api-client';
import { GroupMemberPicker } from '@/components/chat/group-member-picker';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form';

interface MeetingFormProps {
  initial?: Partial<MeetingPayload>;
  initialParticipants?: UserDirectoryItem[];
  isSubmitting: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (payload: MeetingPayload) => void;
  onCancel: () => void;
}

export function MeetingForm({ initial, initialParticipants, isSubmitting, error, submitLabel, onSubmit, onCancel }: MeetingFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.scheduledDate ? initial.scheduledDate.slice(0, 10) : '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [participants, setParticipants] = useState<UserDirectoryItem[]>(initialParticipants ?? []);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) return setValidationError('Title is required.');
    if (!date) return setValidationError('Date is required.');
    if (new Date(date) < new Date(new Date().toDateString())) return setValidationError('Date must be in the future.');
    if (!startTime || !endTime) return setValidationError('Start and end time are required.');
    if (startTime >= endTime) return setValidationError('End time must be after start time.');
    if (participants.length === 0) return setValidationError('Select at least one participant.');

    setValidationError(null);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledDate: new Date(date).toISOString(),
      startTime,
      endTime,
      participants: participants.map((p) => p.id),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" autoFocus />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Agenda or details (optional)" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
        <div className="flex-1">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label>Start Time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label>End Time</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Participants</Label>
        <GroupMemberPicker selectedUsers={participants} onChange={setParticipants} />
      </div>
      {(validationError || error) && <p className="field-error">{validationError || error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
