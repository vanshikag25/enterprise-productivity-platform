'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementItem,
} from '@/lib/projects-api';

interface AnnouncementFormModalProps {
  projectId: string;
  existing?: AnnouncementItem | null;
  onClose: () => void;
  onSaved: (announcement: AnnouncementItem) => void;
}

export function AnnouncementFormModal({
  projectId,
  existing,
  onClose,
  onSaved,
}: AnnouncementFormModalProps) {
  const { getToken } = useAuth();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [isPinned, setIsPinned] = useState(existing?.isPinned ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }
    if (!body.trim()) {
      setError('Announcement content is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');

      const saved = existing
        ? await updateAnnouncement(token, projectId, existing.id, {
            title: title.trim(),
            body: body.trim(),
            isPinned,
          })
        : await createAnnouncement(token, projectId, {
            title: title.trim(),
            body: body.trim(),
            isPinned,
          });

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement.');
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
        className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={existing ? 'Edit announcement' : 'New announcement'}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {existing ? 'Edit announcement' : 'New announcement'}
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
          placeholder="Announcement title"
          className="mb-3 w-full rounded border px-2 py-1.5 text-sm"
        />

        <label className="mb-1 block text-xs font-medium text-gray-600">Content</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the announcement…"
          rows={5}
          className="mb-3 w-full rounded border px-2 py-1.5 text-sm"
        />

        <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4"
          />
          Pin to the top
        </label>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : existing ? 'Save changes' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
