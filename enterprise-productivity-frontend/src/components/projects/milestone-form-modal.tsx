'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  createMilestone,
  updateMilestone,
  listProjectMembers,
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABELS,
  type MilestoneItem,
  type MilestoneStatus,
  type ProjectMember,
} from '@/lib/projects-api';

interface MilestoneFormModalProps {
  projectId: string;
  existing?: MilestoneItem | null;
  onClose: () => void;
  onSaved: (milestone: MilestoneItem) => void;
}

export function MilestoneFormModal({
  projectId,
  existing,
  onClose,
  onSaved,
}: MilestoneFormModalProps) {
  const { getToken } = useAuth();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dueDate, setDueDate] = useState(
    existing?.dueDate ? existing.dueDate.slice(0, 10) : '',
  );
  const [ownerId, setOwnerId] = useState(existing?.ownerId ?? '');
  const [status, setStatus] = useState<MilestoneStatus>(
    existing?.status ?? 'planned',
  );
  const [progress, setProgress] = useState(existing?.progress ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        setMembers(await listProjectMembers(token, projectId));
      } catch {
        // Member selection is optional; fail silently.
      }
    })();
  }, [getToken, projectId]);

  async function handleSave() {
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        ownerId: ownerId || undefined,
        status,
        progress,
      };

      const saved = existing
        ? await updateMilestone(token, projectId, existing.id, payload)
        : await createMilestone(token, projectId, payload);

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save milestone.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={existing ? 'Edit milestone' : 'New milestone'}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {existing ? 'Edit milestone' : 'New milestone'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Milestone title"
          className="mb-3 w-full rounded border px-2 py-1.5 text-sm"
        />

        <label className="mb-1 block text-xs font-medium text-gray-600">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this milestone deliver?"
          rows={3}
          className="mb-3 w-full rounded border px-2 py-1.5 text-sm"
        />

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Due date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Owner (optional)
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email ?? m.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              className="w-full rounded border px-2 py-1.5 text-sm"
            >
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {MILESTONE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Progress: {progress}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : existing ? 'Save changes' : 'Create milestone'}
        </button>
      </div>
    </div>
  );
}
