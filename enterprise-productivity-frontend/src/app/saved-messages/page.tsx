'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  deleteBookmark,
  fetchBookmarks,
  type BookmarkItem,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Select, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { IconBookmark, IconTrash, IconArrowRight } from '@/components/ui/icons';

const PAGE_SIZE = 15;

function timeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SavedMessagesPage() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [page, setPage] = useState(1);

  async function loadBookmarks() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setBookmarks(await fetchBookmarks(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved messages.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadBookmarks, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const channels = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookmarks) {
      if (b.sourceChannelId && !map.has(b.sourceChannelId)) {
        map.set(b.sourceChannelId, b.sourceChannelName ?? 'Unnamed channel');
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [bookmarks]);

  const filtered = useMemo(() => {
    let result = bookmarks;
    if (channelFilter) {
      result = result.filter((b) => b.sourceChannelId === channelFilter);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (b) =>
          (b.sourceMessageText ?? '').toLowerCase().includes(term) ||
          (b.sourceSenderName ?? '').toLowerCase().includes(term) ||
          (b.sourceChannelName ?? '').toLowerCase().includes(term),
      );
    }
    return [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [bookmarks, search, channelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openMessage(bookmark: BookmarkItem) {
    router.push(
      `/dashboard?channel=${encodeURIComponent(bookmark.sourceChannelId)}&message=${encodeURIComponent(bookmark.sourceMessageId)}`,
    );
  }

  async function handleRemove(bookmark: BookmarkItem) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteBookmark(token, bookmark.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
      showToast('Bookmark removed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove bookmark.', 'error');
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Saved Messages"
        subtitle="Messages you bookmarked to revisit later."
        icon={<IconBookmark width={20} height={20} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search saved messages…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
        </div>
        <Select
          value={channelFilter}
          onChange={(e) => {
            setChannelFilter(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="">All channels</option>
          {channels.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={loadBookmarks} />}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<IconBookmark width={26} height={26} />}
          title={search || channelFilter ? 'No saved messages match' : 'No saved messages yet'}
          description={
            search || channelFilter
              ? 'Try adjusting your filters.'
              : 'Bookmark a chat message to save it here for quick access.'
          }
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <>
          <div className="data-list">
            {pageItems.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"
                onClick={() => openMessage(bookmark)}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <IconBookmark width={16} height={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {bookmark.sourceMessageText ?? (
                      <span className="italic text-slate-400">Attachment or image message</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {bookmark.sourceSenderName ?? 'Unknown sender'}
                    {bookmark.sourceChannelName ? ` · ${bookmark.sourceChannelName}` : ''}
                    {' · '}{timeAgo(bookmark.createdAt)}
                  </p>
                </div>
                <button
                  aria-label="Open in chat"
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMessage(bookmark);
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    Open <IconArrowRight width={12} height={12} />
                  </span>
                </button>
                <button
                  aria-label="Remove bookmark"
                  className="shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(bookmark);
                  }}
                >
                  <IconTrash width={15} height={15} />
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
