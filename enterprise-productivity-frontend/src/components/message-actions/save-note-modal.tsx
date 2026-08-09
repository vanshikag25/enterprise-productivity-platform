'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { createNote, type NotePayload } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/form';
import { messageTextSnippet, type SourceMessageRef } from './source-message';

interface SaveNoteFromMessageModalProps {
  open: boolean;
  onClose: () => void;
  source: SourceMessageRef;
}

export function SaveNoteFromMessageModal({
  open,
  onClose,
  source,
}: SaveNoteFromMessageModalProps) {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const snippet = messageTextSnippet({
    id: source.sourceMessageId ?? 'source',
    text: source.sourceMessageText,
  });
  const [title, setTitle] = useState(snippet);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) return setValidationError('Title is required.');
    if (!content.trim()) return setValidationError('Note content is required.');

    setValidationError(null);
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const payload: NotePayload = {
        title: title.trim(),
        content: content.trim(),
        sourceChannelId: source.sourceChannelId,
        sourceMessageId: source.sourceMessageId,
        sourceSenderId: source.sourceSenderId,
        sourceChannelName: source.sourceChannelName,
        sourceMessageText: source.sourceMessageText,
      };
      await createNote(token, payload);
      showToast('Note saved.');
      onClose();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Save as Note">
      <div className="flex flex-col gap-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" autoFocus />
        </div>
        <div>
          <Label>Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Write your note…" />
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {source.sourceChannelName ? `Linked to ${source.sourceChannelName}` : 'Personal note'}
        </div>
        {validationError && <p className="field-error">{validationError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
