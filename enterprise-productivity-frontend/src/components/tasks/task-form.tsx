'use client';

import { useState } from 'react';
import type { TaskPayload, UserDirectoryItem } from '@/lib/api-client';
import { GroupMemberPicker } from '@/components/chat/group-member-picker';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/form';

const STATUSES = ['Todo', 'In Progress', 'In Review', 'Completed', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

interface TaskFormProps {
  initial?: Partial<TaskPayload>;
  initialAssignee?: UserDirectoryItem | null;
  showStatus?: boolean;
  isSubmitting: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (payload: TaskPayload) => void;
  onCancel: () => void;
}

export function TaskForm({
  initial, initialAssignee, showStatus, isSubmitting, error, submitLabel, onSubmit, onCancel,
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 'Medium');
  const [status, setStatus] = useState(initial?.status ?? 'Todo');
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.slice(0, 10) : '');
  const [assignee, setAssignee] = useState<UserDirectoryItem[]>(initialAssignee ? [initialAssignee] : []);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) {
      setValidationError('Title is required.');
      return;
    }
    setValidationError(null);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      ...(showStatus ? { status } : {}),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      assignee: assignee[0]?.id,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add more detail (optional)" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
        <div className="flex-1">
          <Label>Priority</Label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>

        {showStatus && (
          <div className="flex-1">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}

        <div className="flex-1">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Assignee</Label>
        <GroupMemberPicker
          selectedUsers={assignee}
          onChange={(users) => setAssignee(users.length ? [users[users.length - 1]] : [])}
        />
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
