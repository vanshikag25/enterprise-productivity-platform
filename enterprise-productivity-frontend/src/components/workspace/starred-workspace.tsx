'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { fetchBookmarks, deleteBookmark, type BookmarkItem } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { IconBookmark, IconMessageCircle, IconTrash } from '@/components/ui/icons';
import { useWorkspace } from './workspace-context';

export function StarredWorkspace() {
  const { getToken, userId } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { setMode } = useWorkspace();

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const data = await fetchBookmarks(token);
        if (!cancelled) setBookmarks(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load starred messages.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleDelete(bookmark: BookmarkItem) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteBookmark(token, bookmark.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
      showToast('Removed from starred.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove bookmark.', 'error');
    }
  }

  function openBookmark(bookmark: BookmarkItem) {
    if (bookmark.sourceChannelId) {
      router.push(
        `/dashboard?channel=${encodeURIComponent(bookmark.sourceChannelId)}&message=${encodeURIComponent(bookmark.sourceMessageId)}`,
      );
    }
  }

  if (isLoading) {
    return (
      <div className="p-5">
        <SkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message={error} />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="No starred messages"
          description="Star messages from any conversation to keep them handy here."
          icon={<IconBookmark width={24} height={24} />}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <IconBookmark width={18} height={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Starred</h2>
        </div>
        <button
          onClick={() => setMode(null)}
          aria-label="Close starred"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-slate-100">
          {bookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <Avatar name={bookmark.sourceSenderName ?? '?'} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-slate-500">
                    {bookmark.sourceSenderName ?? 'Unknown'} · {bookmark.sourceChannelName ?? 'Unknown channel'}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                  {bookmark.sourceMessageText ?? 'No preview available.'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openBookmark(bookmark)} disabled={!bookmark.sourceChannelId}>
                    <IconMessageCircle width={14} height={14} />
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(bookmark)}
                  >
                    <IconTrash width={14} height={14} />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}