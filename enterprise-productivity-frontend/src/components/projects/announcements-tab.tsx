'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  listAnnouncements,
  setAnnouncementPinned,
  deleteAnnouncement,
  addAnnouncementReaction,
  removeAnnouncementReaction,
  type AnnouncementItem,
  type ProjectItem,
} from '@/lib/projects-api';
import { AnnouncementFormModal } from './announcement-form-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { UserListSkeleton } from '@/components/directory/user-list-skeleton';
import { formatLastSeen } from '@/lib/format-date';
import { useToast } from '@/hooks/use-toast';

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🎉', '🚀'];

interface AnnouncementsTabProps {
  project: ProjectItem;
  canManage: boolean;
}

export function AnnouncementsTab({ project, canManage }: AnnouncementsTabProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setAnnouncements(
        await listAnnouncements(token, project.id, search.trim() || undefined),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements.');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, project.id, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  function replaceOne(updated: AnnouncementItem) {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  }

  async function togglePin(item: AnnouncementItem) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await setAnnouncementPinned(
        token,
        project.id,
        item.id,
        !item.isPinned,
      );
      replaceOne(updated);
      showToast(updated.isPinned ? 'Pinned.' : 'Unpinned.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update pin.', 'error');
    }
  }

  async function toggleReaction(item: AnnouncementItem, emoji: string) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const reacted = item.reactions.find(
        (r) => r.emoji === emoji && r.reactedByMe,
      );
      const updated = reacted
        ? await removeAnnouncementReaction(token, project.id, item.id, emoji)
        : await addAnnouncementReaction(token, project.id, item.id, emoji);
      replaceOne(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update reaction.', 'error');
    }
  }

  async function handleDelete(item: AnnouncementItem) {
    if (!window.confirm(`Delete the announcement "${item.title}"?`)) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteAnnouncement(token, project.id, item.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
      showToast('Announcement deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete.', 'error');
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search announcements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded border px-3 py-1.5 text-sm"
          />
          {canManage && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              New Announcement
            </button>
          )}
        </div>

        {isLoading && <UserListSkeleton />}
        {!isLoading && error && <ErrorState message={error} />}
        {!isLoading && !error && announcements.length === 0 && (
          <EmptyState
            title="No announcements"
            description="Post an announcement to keep the team informed."
          />
        )}

        {!isLoading &&
          !error &&
          announcements.length > 0 && (
            <div className="flex flex-col gap-3">
              {announcements.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-lg border p-4 ${item.isPinned ? 'border-blue-200 bg-blue-50/50' : ''}`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      {item.isPinned && <span aria-label="Pinned">📌</span>}
                      <span className="truncate">{item.title}</span>
                    </h3>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => togglePin(item)}
                          className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                        >
                          {item.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(item);
                            setShowForm(true);
                          }}
                          className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mb-1 text-xs text-gray-400">
                    {item.authorName ?? 'Unknown'} · {formatLastSeen(item.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{item.body}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {QUICK_EMOJIS.map((emoji) => {
                      const reaction = item.reactions.find((r) => r.emoji === emoji);
                      const count = reaction?.count ?? 0;
                      const isActive = Boolean(reaction?.reactedByMe);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(item, emoji)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            isActive
                              ? 'border-blue-400 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                    {item.reactionCount > 0 && (
                      <span className="ml-auto text-xs text-gray-400">
                        {item.reactionCount} reaction{item.reactionCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
      </div>

      {showForm && (
        <AnnouncementFormModal
          projectId={project.id}
          existing={editing}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setAnnouncements((prev) =>
              prev.some((a) => a.id === saved.id)
                ? prev.map((a) => (a.id === saved.id ? saved : a))
                : [saved, ...prev],
            );
            showToast(editing ? 'Announcement updated.' : 'Announcement published.');
          }}
        />
      )}
    </div>
  );
}
