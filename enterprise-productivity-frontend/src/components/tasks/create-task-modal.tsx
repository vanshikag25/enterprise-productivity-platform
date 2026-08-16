'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import {
  createTask,
  createCreationRequest,
  type TaskItem,
  type CreationRequestItem,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { IconPlus } from '@/components/ui/icons';
import { TaskForm } from './task-form';

interface CreateTaskModalProps {
  onCreated: (item: TaskItem | CreationRequestItem) => void;
  trigger?: ReactNode;
}

export function CreateTaskModal({ onCreated, trigger }: CreateTaskModalProps) {
  const { getToken } = useAuth();
  const { can } = useRole();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: Parameters<typeof createTask>[1]) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');

      if (!can('create_task')) {
        const request = await createCreationRequest(token, {
          entityType: 'task',
          payload,
        });
        showToast('Task request submitted — a team lead will review it.');
        onCreated(request);
        setIsOpen(false);
        return;
      }

      const task = await createTask(token, payload);
      showToast('Task created.');
      onCreated(task);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const requiresApproval = !can('create_task');
  const defaultTrigger = (
    <Button size="sm" onClick={() => setIsOpen(true)}>
      <IconPlus width={15} height={15} /> New Task
    </Button>
  );

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
            onClick: () => setIsOpen(true),
          })
        : defaultTrigger}
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="New Task"
      >
        {requiresApproval && (
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Your task will be sent to a team lead for approval before it is
            created.
          </div>
        )}
        <TaskForm
          isSubmitting={isSubmitting}
          error={error}
          submitLabel={requiresApproval ? 'Submit for approval' : 'Create'}
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
}