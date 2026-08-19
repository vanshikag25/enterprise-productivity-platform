'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getOrCreateTaskChannel,
  type TaskItem,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useTaskDirectory } from '@/hooks/use-task-directory';
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/form';
import { SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { IconClose, IconMessageCircle } from '@/components/ui/icons';
import { TaskForm } from '@/components/tasks/task-form';
import { useWorkspace } from './workspace-context';

const STATUSES = ['Todo', 'In Progress', 'In Review', 'Completed', 'Closed'];
const FINAL_STATUSES = ['Completed', 'Closed'];

export function TaskWorkspace({ taskId }: { taskId: string }) {
  const { getToken, userId } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { users } = useTaskDirectory();
  const { can } = useRole();
  const { setMode } = useWorkspace();

  const [task, setTask] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTask(null);
    setIsEditing(false);

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const data = await fetchTask(token, taskId);
        if (!cancelled) setTask(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load task.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [taskId, getToken]);

  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!task) return;
      setIsBusy(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const updated = await updateTaskStatus(token, task.id, status);
        setTask(updated);
        showToast('Status updated.');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error');
      } finally {
        setIsBusy(false);
      }
    },
    [task, getToken, showToast],
  );

  const handleEditSubmit = useCallback(
    async (payload: Parameters<typeof updateTask>[2]) => {
      if (!task) return;
      setIsBusy(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const updated = await updateTask(token, task.id, payload);
        setTask(updated);
        showToast('Task updated.');
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task.');
      } finally {
        setIsBusy(false);
      }
    },
    [task, getToken, showToast],
  );

  const handleDelete = useCallback(async () => {
    if (!task) return;
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteTask(token, task.id);
      showToast('Task deleted.');
      setMode(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete task.', 'error');
    } finally {
      setIsBusy(false);
    }
  }, [task, getToken, showToast, setMode]);

  const handleOpenDiscussion = useCallback(async () => {
    if (!task) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      if (task.streamChannelId) {
        router.push(`/dashboard?channel=${task.streamChannelId}`);
        return;
      }
      const { channelId } = await getOrCreateTaskChannel(token, task.id);
      setTask({ ...task, streamChannelId: channelId });
      router.push(`/dashboard?channel=${channelId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open discussion.', 'error');
    }
  }, [task, getToken, router, showToast]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <SkeletonCard className="h-14" />
        <SkeletonCard className="h-48" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message={error ?? 'Task not found.'} />
      </div>
    );
  }

  const assignee = users.find((u) => u.id === task.assignee);
  const isCreator = userId === task.createdBy;
  const isAssignee = userId === task.assignee;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="gray">{task.priority}</Badge>
          <Badge variant="blue">{task.status}</Badge>
        </div>
        <button
          onClick={() => setMode(null)}
          aria-label="Close task"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <IconClose width={18} height={18} />
        </button>
      </div>

      <div className="flex-1 p-5">
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
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{task.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {task.description || 'No description.'}
            </p>

            <dl className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</dt>
                <dd>
                  <Select
                    value={task.status}
                    disabled={!(isCreator || isAssignee) || isBusy}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-44 py-1.5 text-xs"
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
                <Button variant="success" onClick={() => handleStatusChange('Completed')} disabled={isBusy}>
                  Mark as Done
                </Button>
              )}
              {isCreator && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
              <Button variant="outline" onClick={handleOpenDiscussion}>
                <IconMessageCircle width={16} height={16} />
                Open Discussion
              </Button>
              {isCreator && can('create_task') && (
                <Button variant="ghost" onClick={handleDelete} disabled={isBusy} className="text-red-600 hover:bg-red-50">
                  Delete
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}