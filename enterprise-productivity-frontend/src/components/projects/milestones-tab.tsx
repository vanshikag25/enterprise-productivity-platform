'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  deleteMilestone,
  listMilestones,
  updateMilestoneProgress,
  updateMilestoneStatus,
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABELS,
  type MilestoneItem,
  type MilestoneStatus,
  type ProjectItem,
} from '@/lib/projects-api';
import { MilestoneFormModal } from './milestone-form-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { UserListSkeleton } from '@/components/directory/user-list-skeleton';
import { useToast } from '@/hooks/use-toast';

interface MilestonesTabProps {
  project: ProjectItem;
  canManage: boolean;
}

const STATUS_BADGE: Record<MilestoneStatus, string> = {
  planned: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
};

function isOverdue(dueDate: string | null, status: MilestoneStatus): boolean {
  if (!dueDate || status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

export function MilestonesTab({ project, canManage }: MilestonesTabProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | ''>('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'progress' | 'status'>('dueDate');
  const [editing, setEditing] = useState<MilestoneItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setMilestones(
        await listMilestones(token, project.id, {
          status: statusFilter,
          sortBy,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones.');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, project.id, statusFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  function upsert(milestone: MilestoneItem) {
    setMilestones((prev) => {
      const index = prev.findIndex((m) => m.id === milestone.id);
      if (index === -1) return [milestone, ...prev];
      const next = [...prev];
      next[index] = milestone;
      return next;
    });
  }

  async function setProgress(milestone: MilestoneItem, delta: number) {
    const progress = Math.min(100, Math.max(0, milestone.progress + delta));
    if (progress === milestone.progress) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      upsert(await updateMilestoneProgress(token, project.id, milestone.id, progress));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update progress.', 'error');
    }
  }

  async function setCompleted(milestone: MilestoneItem) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateMilestoneStatus(token, project.id, milestone.id, 'completed');
      upsert({ ...updated, progress: 100 });
      showToast(`"${milestone.title}" completed.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.', 'error');
    }
  }

  async function handleDelete(milestone: MilestoneItem) {
    if (!window.confirm(`Delete milestone "${milestone.title}"?`)) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteMilestone(token, project.id, milestone.id);
      setMilestones((prev) => prev.filter((m) => m.id !== milestone.id));
      showToast('Milestone deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete.', 'error');
    }
  }

  function openDiscussion(milestone: MilestoneItem) {
    if (!milestone.streamChannelId) return;
    router.push(`/dashboard?channel=${encodeURIComponent(milestone.streamChannelId)}`);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Milestones</h2>
          {canManage && (
            <button
              onClick={() => setIsCreating(true)}
              className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              + New milestone
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MilestoneStatus | '')}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MILESTONE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'dueDate' | 'progress' | 'status')
            }
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="dueDate">Sort by due date</option>
            <option value="progress">Sort by progress</option>
            <option value="status">Sort by status</option>
          </select>
        </div>

        {isLoading && <UserListSkeleton />}
        {!isLoading && error && <ErrorState message={error} onRetry={load} />}
        {!isLoading && !error && milestones.length === 0 && (
          <EmptyState
            title="No milestones yet"
            description={
              canManage
                ? 'Create a milestone to track key deliverables and deadlines.'
                : 'Milestones for this project will appear here.'
            }
          />
        )}

        {!isLoading && !error && milestones.length > 0 && (
          <div className="flex flex-col gap-3">
            {milestones.map((milestone) => {
              const overdue = isOverdue(milestone.dueDate, milestone.status);
              return (
                <div key={milestone.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {milestone.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_BADGE[milestone.status]}`}
                        >
                          {MILESTONE_STATUS_LABELS[milestone.status]}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      Due{' '}
                      {milestone.dueDate
                        ? new Date(milestone.dueDate).toLocaleDateString()
                        : '—'}
                      {overdue && <span className="ml-1 text-red-500">(overdue)</span>}
                    </span>
                    <span>Owner: {milestone.ownerName ?? 'Unassigned'}</span>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-gray-200">
                      <div
                        className="h-full rounded bg-blue-600 transition-all"
                        style={{ width: `${milestone.progress}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-medium text-gray-600">
                      {milestone.progress}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {milestone.streamChannelId && (
                      <button
                        onClick={() => openDiscussion(milestone)}
                        className="rounded border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        💬 Open discussion
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={() => setProgress(milestone, 10)}
                          className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          +10%
                        </button>
                        <button
                          onClick={() => setProgress(milestone, -10)}
                          className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          −10%
                        </button>
                        {milestone.status !== 'completed' && (
                          <button
                            onClick={() => setCompleted(milestone)}
                            className="rounded border px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                          >
                            ✓ Mark complete
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(milestone)}
                          className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(milestone)}
                          className="rounded border px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(isCreating || editing) && (
        <MilestoneFormModal
          projectId={project.id}
          existing={editing}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onSaved={upsert}
        />
      )}
    </div>
  );
}
