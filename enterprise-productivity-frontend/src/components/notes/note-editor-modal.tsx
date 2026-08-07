'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  createNote,
  updateNote,
  type NoteItem,
  type NotePayload,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/form';

interface NoteEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (note: NoteItem) => void;
  note?: NoteItem | null;
}

export function NoteEditorModal({
  open,
  onClose,
  onSaved,
  note,
}: NoteEditorModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setError(null);
  }, [open, note]);

  async function handleSubmit() {
    if (!title.trim()) return setError('Title is required.');
    if (!content.trim()) return setError('Note content is required.');

    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const payload: NotePayload = { title: title.trim(), content: content.trim() };
      const saved = note
        ? await updateNote(token, note.id, payload)
        : await createNote(token, payload);
      showToast(note ? 'Note updated.' : 'Note saved.');
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={note ? 'Edit Note' : 'New Note'}>
      <div className="flex flex-col gap-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" autoFocus />
        </div>
        <div>
          <Label>Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Write your note…" />
        </div>
        {note?.sourceChannelName && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Linked to {note.sourceChannelName}
          </div>
        )}
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : note ? 'Save changes' : 'Save note'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
