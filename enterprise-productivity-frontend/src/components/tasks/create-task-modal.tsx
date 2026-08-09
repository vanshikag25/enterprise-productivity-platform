'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import { createTask, type TaskItem } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { IconPlus } from '@/components/ui/icons';
import { TaskForm } from './task-form';

interface CreateTaskModalProps {
  onCreated: (task: TaskItem) => void;
  trigger?: ReactNode;
}

export function CreateTaskModal({ onCreated, trigger }: CreateTaskModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: Parameters<typeof createTask>[1]) {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
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

  const defaultTrigger = (
    <Button size="sm">
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
        <TaskForm
          isSubmitting={isSubmitting}
          error={error}
          submitLabel="Create"
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
}
