'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MessageComposer,
  useChannelStateContext,
  useChatContext,
} from 'stream-chat-react';
import type { DraftResponse } from 'stream-chat';
import { SmartReplySuggestions } from './smart-reply-suggestions';

const DRAFT_SAVE_DELAY_MS = 600;
const DRAFT_SAVED_HINT_MS = 1800;

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

const STATUS_LABELS: Record<DraftStatus, string | null> = {
  idle: null,
  saving: 'Saving draft…',
  saved: 'Draft saved',
  error: "Couldn't save draft",
};

export function MessageComposerWithDrafts() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();

  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const needsResaveRef = useRef(false);
  const hasDraftRef = useRef(false);
  const lastSavedKeyRef = useRef('');
  const suppressSaveRef = useRef(false);

  useEffect(() => {
    if (!channel) return;

    const composer = channel.messageComposer;
    if (!composer) return;

    let disposed = false;

    hasDraftRef.current = false;
    lastSavedKeyRef.current = '';
    suppressSaveRef.current = false;

    function setStatus(next: DraftStatus) {
      if (disposed) return;
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }
      setDraftStatus(next);
      if (next === 'saved') {
        statusTimerRef.current = setTimeout(() => {
          statusTimerRef.current = null;
          if (!disposed) setDraftStatus('idle');
        }, DRAFT_SAVED_HINT_MS);
      }
    }

    async function persistDraft() {
      if (saveInFlightRef.current) {
        needsResaveRef.current = true;
        return;
      }
      saveInFlightRef.current = true;
      try {
        saveTimerRef.current = null;
        if (!composer || composer.editedMessage) return;
        if (composer.compositionIsEmpty) {
          if (hasDraftRef.current) {
            hasDraftRef.current = false;
            lastSavedKeyRef.current = '';
            setStatus('idle');
            await channel.deleteDraft().catch(() => undefined);
          }
          return;
        }
        const state = await composer.composeDraft();
        if (!state?.draft) return;
        const key = serializeDraft(state.draft);
        if (key === lastSavedKeyRef.current) return;
        setStatus('saving');
        await channel.createDraft(state.draft);
        hasDraftRef.current = true;
        lastSavedKeyRef.current = key;
        setStatus('saved');
      } catch (err) {
        console.error('Failed to save chat draft:', err);
        setStatus('error');
      } finally {
        saveInFlightRef.current = false;
        if (needsResaveRef.current) {
          needsResaveRef.current = false;
          void persistDraft();
        }
      }
    }

    function scheduleSave() {
      if (suppressSaveRef.current) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void persistDraft();
      }, DRAFT_SAVE_DELAY_MS);
    }

    function handleStateChange(_value: unknown, previousValue?: unknown) {
      if (previousValue === undefined) return;
      scheduleSave();
    }

    const textUnsubscribe = composer.textComposer?.state?.subscribe(handleStateChange);
    const attachmentUnsubscribe = composer.attachmentManager?.state?.subscribe(handleStateChange);

    async function restoreDraft() {
      if (composer.editedMessage) return;
      try {
        const response = await channel.getDraft();
        const draft = response?.draft;
        if (!draft || disposed || composer.editedMessage || !composer.compositionIsEmpty) return;
        suppressSaveRef.current = true;
        composer.initState({ composition: draft });
        suppressSaveRef.current = false;
        hasDraftRef.current = true;
        lastSavedKeyRef.current = serializeDraft(draft.message);
        setStatus('saved');
      } catch {
        // 404 means there is no saved draft; other errors leave the composer empty.
      }
    }

    void restoreDraft();

    function eventMatchesCurrentComposer(draft: DraftResponse): boolean {
      if (composer.textComposer.text !== (draft.message.text ?? '')) return false;
      const currentAttachmentCount = composer.attachmentManager.attachments.length;
      return currentAttachmentCount === (draft.message.attachments?.length ?? 0);
    }

    function handleDraftUpdated(event: { draft?: DraftResponse }) {
      const draft = event?.draft;
      if (!draft || draft.channel_cid !== channel.cid) return;
      if (suppressSaveRef.current) return;
      if (composer.editedMessage || !composer.compositionIsEmpty) return;
      if (lastSavedKeyRef.current && serializeDraft(draft.message) === lastSavedKeyRef.current) {
        return;
      }
      suppressSaveRef.current = true;
      composer.initState({ composition: draft });
      suppressSaveRef.current = false;
      lastSavedKeyRef.current = serializeDraft(draft.message);
      hasDraftRef.current = true;
    }

    function handleDraftDeleted(event: { draft?: DraftResponse }) {
      const draft = event?.draft;
      if (!draft || draft.channel_cid !== channel.cid) return;
      if (suppressSaveRef.current) return;
      if (composer.editedMessage || composer.compositionIsEmpty) return;
      if (!eventMatchesCurrentComposer(draft)) return;
      hasDraftRef.current = false;
      lastSavedKeyRef.current = '';
      composer.clear();
    }

    function handleMessageNew(event: { user?: { id?: string } }) {
      if (event?.user?.id !== client.userID) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (hasDraftRef.current) {
        hasDraftRef.current = false;
        lastSavedKeyRef.current = '';
        setStatus('idle');
        void channel.deleteDraft().catch(() => undefined);
      }
    }

    const draftUpdatedHandler = client.on('draft.updated', handleDraftUpdated);
    const draftDeletedHandler = client.on('draft.deleted', handleDraftDeleted);
    const messageNewHandler = channel.on('message.new', handleMessageNew);

    return () => {
      disposed = true;
      textUnsubscribe?.();
      attachmentUnsubscribe?.();
      draftUpdatedHandler.unsubscribe();
      draftDeletedHandler.unsubscribe();
      messageNewHandler.unsubscribe();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [channel, client]);

  const statusLabel = STATUS_LABELS[draftStatus];

  function insertSmartReply(suggestion: string) {
    if (!channel) return;
    const composer = channel.messageComposer;
    if (!composer?.textComposer) return;
    composer.textComposer.setText(suggestion);
  }

  return (
    <>
      <SmartReplySuggestions onInsert={insertSmartReply} />
      {statusLabel && (
        <div
          role="status"
          className="flex items-center justify-end px-4 pb-1 text-[11px] text-slate-400"
        >
          {statusLabel}
        </div>
      )}
      <MessageComposer audioRecordingEnabled />
    </>
  );
}

function serializeDraft(draft: {
  text?: string;
  mentioned_users?: unknown;
  mentioned_channel?: unknown;
  mentioned_here?: unknown;
  attachments?: unknown;
  quoted_message_id?: unknown;
  poll_id?: unknown;
}): string {
  return JSON.stringify([
    draft.text ?? '',
    draft.mentioned_users ?? [],
    draft.mentioned_channel ?? false,
    draft.mentioned_here ?? false,
    draft.attachments ?? [],
    draft.quoted_message_id ?? '',
    draft.poll_id ?? '',
  ]);
}
