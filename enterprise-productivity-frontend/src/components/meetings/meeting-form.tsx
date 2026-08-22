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
  mode?: 'schedule' | 'now';
  onSubmit: (payload: MeetingPayload) => void;
  onCancel: () => void;
}

export function MeetingForm({ initial, initialParticipants, isSubmitting, error, submitLabel, mode = 'schedule', onSubmit, onCancel }: MeetingFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [agenda, setAgenda] = useState(initial?.agenda ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [recordingLink, setRecordingLink] = useState(initial?.recordingLink ?? '');
  const [attachments, setAttachments] = useState(initial?.attachments?.join(', ') ?? '');
  const [date, setDate] = useState(initial?.scheduledDate ? initial.scheduledDate.slice(0, 10) : '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [participants, setParticipants] = useState<UserDirectoryItem[]>(initialParticipants ?? []);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) return setValidationError('Title is required.');
    if (mode === 'schedule') {
      if (!date) return setValidationError('Date is required.');
      if (new Date(date) < new Date(new Date().toDateString())) return setValidationError('Date must be in the future.');
      if (!startTime || !endTime) return setValidationError('Start and end time are required.');
      if (startTime >= endTime) return setValidationError('End time must be after start time.');
    }
    if (participants.length === 0) return setValidationError('Select at least one participant.');

    setValidationError(null);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      agenda: agenda.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments: attachments
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      recordingLink: recordingLink.trim() || undefined,
      scheduledDate: mode === 'schedule' ? new Date(date).toISOString() : new Date().toISOString(),
      startTime: mode === 'schedule' ? startTime : new Date().toTimeString().slice(0, 5),
      endTime: mode === 'schedule' ? endTime : new Date(Date.now() + 60 * 60 * 1000).toTimeString().slice(0, 5),
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
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Meeting description" />
      </div>
      <div>
        <Label>Agenda</Label>
        <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} placeholder="Agenda items or discussion topics" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Meeting notes or action items" />
      </div>
      <div>
        <Label>Attachments / docs</Label>
        <Input value={attachments} onChange={(e) => setAttachments(e.target.value)} placeholder="Comma-separated document URLs or names" />
      </div>
      <div>
        <Label>Recording link</Label>
        <Input value={recordingLink} onChange={(e) => setRecordingLink(e.target.value)} placeholder="Optional recording URL" />
      </div>
      {mode === 'schedule' && (
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
      )}
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
