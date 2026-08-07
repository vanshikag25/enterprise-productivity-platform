'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { SourceMessageRef } from './source-message';
import { CreateEventFromMessageModal } from './create-event-modal';
import { CreateReminderFromMessageModal } from './create-reminder-modal';
import { SaveNoteFromMessageModal } from './save-note-modal';
import { PollFormModal } from '@/components/polls/poll-form-modal';

export type MessageActionModalType =
  | 'createEvent'
  | 'createReminder'
  | 'saveAsNote'
  | 'createPoll';

interface ModalRequest {
  type: MessageActionModalType;
  source: SourceMessageRef;
}

interface MessageActionModalHostValue {
  openModal: (type: MessageActionModalType, source: SourceMessageRef) => void;
}

const MessageActionModalHostContext = createContext<MessageActionModalHostValue | null>(null);

export function useMessageActionModalHost(): MessageActionModalHostValue {
  const ctx = useContext(MessageActionModalHostContext);
  if (!ctx) throw new Error('useMessageActionModalHost must be used within MessageActionModalHost.');
  return ctx;
}

export function MessageActionModalHost({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ModalRequest | null>(null);

  const openModal = useCallback((type: MessageActionModalType, source: SourceMessageRef) => {
    setRequest({ type, source });
  }, []);

  const closeModal = useCallback(() => setRequest(null), []);

  return (
    <MessageActionModalHostContext.Provider value={{ openModal }}>
      {children}
      {request?.type === 'createEvent' && (
        <CreateEventFromMessageModal open onClose={closeModal} source={request.source} />
      )}
      {request?.type === 'createReminder' && (
        <CreateReminderFromMessageModal open onClose={closeModal} source={request.source} />
      )}
      {request?.type === 'saveAsNote' && (
        <SaveNoteFromMessageModal open onClose={closeModal} source={request.source} />
      )}
      {request?.type === 'createPoll' && (
        <PollFormModal
          open
          onClose={closeModal}
          mode="create"
          channelId={request.source.sourceChannelId}
          initialQuestion={request.source.sourceMessageText ?? ''}
        />
      )}
    </MessageActionModalHostContext.Provider>
  );
}
