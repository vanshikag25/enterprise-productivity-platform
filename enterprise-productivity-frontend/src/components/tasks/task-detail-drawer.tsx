'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { updateTask, updateTaskStatus, deleteTask, getOrCreateTaskChannel, type TaskItem } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useTaskDirectory } from '@/hooks/use-task-directory';
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/form';
import { IconClose, IconMessageCircle, IconPlus, IconTrash } from '@/components/ui/icons';
import { TaskForm } from './task-form';

const STATUSES = ['Todo', 'In Progress', 'In Review', 'Completed', 'Closed'];
const FINAL_STATUSES = ['Completed', 'Closed'];

interface TaskDetailDrawerProps {
  task: TaskItem;
  currentUserId: string | null | undefined;
  onClose: () => void;
  onUpdated: (task: TaskItem) => void;
  onDeleted: (id: string) => void;
}

export function TaskDetailDrawer({ task, currentUserId, onClose, onUpdated, onDeleted }: TaskDetailDrawerProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { users } = useTaskDirectory();
  const { can } = useRole();

  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = currentUserId === task.createdBy;
  const isAssignee = currentUserId === task.assignee;

  async function handleStatusChange(status: string) {
    setIsBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateTaskStatus(token, task.id, status);
      onUpdated(updated);
      showToast('Status updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEditSubmit(payload: Parameters<typeof updateTask>[2]) {
    setIsBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateTask(token, task.id, payload);
      onUpdated(updated);
      showToast('Task updated.');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteTask(token, task.id);
      showToast('Task deleted.');
      onDeleted(task.id);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete task.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMarkDone() {
    if (!window.confirm(`Mark "${task.title}" as done? The task discussion will be archived and become read-only.`)) return;
    setIsBusy(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateTaskStatus(token, task.id, 'Completed');
      onUpdated(updated);
      showToast('Task marked as done.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpenDiscussion() {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');

      if (task.streamChannelId) {
        router.push(`/dashboard?channel=${task.streamChannelId}`);
        return;
      }

      const { channelId } = await getOrCreateTaskChannel(token, task.id);
      onUpdated({ ...task, streamChannelId: channelId });
      router.push(`/dashboard?channel=${channelId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open discussion.', 'error');
    }
  }

  const assignee = users.find((u) => u.id === task.assignee);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-slate-900">Task details</h2>
          <button onClick={onClose} aria-label="Close" className="btn-icon btn-ghost rounded-lg text-slate-400 hover:text-slate-600">
            <IconClose width={18} height={18} />
          </button>
        </div>

        <div className="p-5">
          {isEditing ? (
            <TaskForm
              initial={{ title: task.title, description: task.description ?? '', priority: task.priority, dueDate: task.dueDate ?? undefined }}
              initialAssignee={assignee ?? null}
              isSubmitting={isBusy}
              error={error}
              submitLabel="Save"
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">{task.title}</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description || 'No description.'}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="gray">{task.priority}</Badge>
                <Badge variant="blue">{task.status}</Badge>
              </div>

              <dl className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</dt>
                  <dd>
                    <Select
                      value={task.status}
                      disabled={!(isCreator || isAssignee) || isBusy}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-44 py-1.5 text-xs disabled:opacity-50"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Due date</dt>
                  <dd className="text-slate-800">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</dt>
                  <dd className="text-slate-800">{new Date(task.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Updated</dt>
                  <dd className="text-slate-800">{new Date(task.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-3">
                <Avatar name={assignee?.name ?? 'Unassigned'} imageUrl={assignee?.imageUrl} size="md" />
                <div className="min-w-0 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Assignee</p>
                  <p className="truncate font-medium text-slate-800">{assignee?.name ?? 'Unassigned'}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(isCreator || isAssignee) && !FINAL_STATUSES.includes(task.status) && (
                  <Button variant="success" onClick={handleMarkDone} disabled={isBusy}>
                    Mark as Done
                  </Button>
                )}
                <Button variant="outline" onClick={handleOpenDiscussion}>
                  <IconMessageCircle width={16} height={16} />
                  Open Discussion
                </Button>
                {isCreator && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <IconPlus width={15} height={15} />
                    Edit
                  </Button>
                )}
                {isCreator && can('create_task') && (
                  <Button variant="ghost" onClick={handleDelete} disabled={isBusy} className="text-red-600 hover:bg-red-50">
                    <IconTrash width={16} height={16} />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
