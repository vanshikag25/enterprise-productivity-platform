'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { createTask, createCreationRequest, type TaskPayload } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { Modal } from '@/components/ui/modal';
import { TaskForm } from '@/components/tasks/task-form';
import { messageTextSnippet, type SourceMessageRef } from './source-message';

interface CreateTaskFromMessageModalProps {
  open: boolean;
  onClose: () => void;
  source: SourceMessageRef;
  prefill?: Partial<TaskPayload>;
  onCreated?: (task: { id: string }) => void;
}

export function CreateTaskFromMessageModal({
  open,
  onClose,
  source,
  prefill,
  onCreated,
}: CreateTaskFromMessageModalProps) {
  const { getToken } = useAuth();
  const { can } = useRole();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: TaskPayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');

      if (!can('create_task')) {
        const request = await createCreationRequest(token, {
          entityType: 'task',
          payload,
          sourceChannelId: source.sourceChannelId,
          sourceMessageId: source.sourceMessageId,
          sourceSenderId: source.sourceSenderId,
          sourceChannelName: source.sourceChannelName,
          sourceMessageText: source.sourceMessageText,
        });
        showToast('Task request submitted — a team lead will review it.');
        onCreated?.({ id: request.id });
        onClose();
        return;
      }

      const task = await createTask(token, payload);
      showToast('Task created from message.');
      onCreated?.({ id: task.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const snippet = messageTextSnippet(
    { id: source.sourceMessageId ?? 'source', text: source.sourceMessageText },
  );
  const requiresApproval = !can('create_task');

  return (
    <Modal open={open} onClose={onClose} title="Create Task" maxWidth="lg">
      <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
        <span className="font-medium text-slate-700">From:</span>{' '}
        {source.sourceChannelName ? `${source.sourceChannelName} — ` : ''}
        {snippet}
      </div>
      {requiresApproval && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Your task will be sent to a team lead for approval before it is
          created.
        </div>
      )}
      <TaskForm
        initial={{
          title: prefill?.title ?? snippet,
          description: prefill?.description ?? undefined,
          ...(prefill?.dueDate ? { dueDate: prefill.dueDate } : {}),
          ...(prefill?.priority ? { priority: prefill.priority } : {}),
          ...(prefill?.assignee ? { assignee: prefill.assignee } : {}),
        }}
        showStatus
        isSubmitting={isSubmitting}
        error={error}
        submitLabel={requiresApproval ? 'Submit for approval' : 'Create task'}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}