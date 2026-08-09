'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  deleteNote,
  fetchNotes,
  type NoteItem,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { NoteEditorModal } from '@/components/notes/note-editor-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { IconNote, IconPlus, IconTrash } from '@/components/ui/icons';

const PAGE_SIZE = 12;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NotesPage() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NoteItem | null>(null);

  async function loadNotes() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setNotes(await fetchNotes(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadNotes, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = notes;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term),
      );
    }
    return [...result].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [notes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(note: NoteItem) {
    if (!window.confirm(`Delete note "${note.title}"?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await deleteNote(token, note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      showToast('Note deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete note.', 'error');
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="My Notes"
        subtitle="Notes you saved — from messages or written by hand."
        icon={<IconNote width={20} height={20} />}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <IconPlus width={15} height={15} /> New note
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search notes…"
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
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={loadNotes} />}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<IconNote width={26} height={26} />}
          title={search ? 'No notes match your search' : 'No notes yet'}
          description={
            search
              ? 'Try a different search term.'
              : 'Use “Save as note” on a chat message, or create a note to get started.'
          }
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((note) => (
              <div
                key={note.id}
                className="group flex cursor-pointer flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-card transition-shadow hover:shadow-popover"
                onClick={() => {
                  setEditing(note);
                  setEditorOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {note.title}
                  </h3>
                  <button
                    aria-label="Delete note"
                    className="shrink-0 rounded-lg p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(note);
                    }}
                  >
                    <IconTrash width={15} height={15} />
                  </button>
                </div>
                <p className="mt-2 line-clamp-4 flex-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                  {note.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-2.5">
                  {note.sourceChannelName && (
                    <Badge variant="blue">
                      {note.sourceMessageId ? 'From message' : 'From channel'}
                    </Badge>
                  )}
                  <span className="text-[10px] font-medium text-slate-400">
                    {formatDate(note.updatedAt)}
                  </span>
                  {note.sourceChannelName && (
                    <button
                      className="ml-auto text-[11px] font-medium text-blue-600 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (note.sourceChannelId && note.sourceMessageId) {
                          router.push(
                            `/dashboard?channel=${encodeURIComponent(note.sourceChannelId)}&message=${encodeURIComponent(note.sourceMessageId)}`,
                          );
                        }
                      }}
                    >
                      {note.sourceChannelName}
                    </button>
                  )}
                </div>
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

      <NoteEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        note={editing}
        onSaved={(saved) => {
          setNotes((prev) =>
            prev.some((n) => n.id === saved.id)
              ? prev.map((n) => (n.id === saved.id ? saved : n))
              : [saved, ...prev],
          );
        }}
      />
    </div>
  );
}
