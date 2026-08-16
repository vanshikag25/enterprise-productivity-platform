'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { resolveAction } from '@/lib/api-client';
import type { SourceMessageRef } from './source-message';
import { CreateEventFromMessageModal } from './create-event-modal';
import { CreateReminderFromMessageModal } from './create-reminder-modal';
import { CreateTaskFromMessageModal } from './create-task-modal';
import { SaveNoteFromMessageModal } from './save-note-modal';
import { PollFormModal } from '@/components/polls/poll-form-modal';

export type MessageActionModalType =
  | 'createEvent'
  | 'createReminder'
  | 'saveAsNote'
  | 'createPoll'
  | 'createTask';

export type MessageActionModalPrefill = Record<string, unknown>;

interface ModalRequest {
  type: MessageActionModalType;
  source: SourceMessageRef;
  actionId?: string;
  prefill?: MessageActionModalPrefill;
  onResolved?: () => void;
}

interface OpenModalOptions {
  actionId?: string;
  prefill?: MessageActionModalPrefill;
  onResolved?: () => void;
}

interface MessageActionModalHostValue {
  openModal: (
    type: MessageActionModalType,
    source: SourceMessageRef,
    options?: OpenModalOptions,
  ) => void;
}

const MessageActionModalHostContext = createContext<MessageActionModalHostValue | null>(null);

export function useMessageActionModalHost(): MessageActionModalHostValue {
  const ctx = useContext(MessageActionModalHostContext);
  if (!ctx) throw new Error('useMessageActionModalHost must be used within MessageActionModalHost.');
  return ctx;
}

export function MessageActionModalHost({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [request, setRequest] = useState<ModalRequest | null>(null);

  const openModal = useCallback(
    (
      type: MessageActionModalType,
      source: SourceMessageRef,
      options?: OpenModalOptions,
    ) => {
      setRequest({
        type,
        source,
        actionId: options?.actionId,
        prefill: options?.prefill,
        onResolved: options?.onResolved,
      });
    },
    [],
  );

  const closeModal = useCallback(() => setRequest(null), []);

  // Called by a modal after it created an entity: records the creation against
  // the AI-suggested action (audit + dedupe) and removes the card via
  // `onResolved`. Entity creation itself is handled by the modal.
  const handleEntityCreated = useCallback(
    (entityType: string) => async (entity: { id: string }) => {
      const current = request;
      if (current?.actionId) {
        try {
          const token = await getToken();
          if (token) {
            await resolveAction(token, current.actionId, {
              entityType,
              entityId: entity.id,
            });
          }
        } catch {
          // Recording the action is best-effort; the entity was already created.
        } finally {
          current.onResolved?.();
        }
      } else {
        current?.onResolved?.();
      }
    },
    [request, getToken],
  );

  return (
    <MessageActionModalHostContext.Provider value={{ openModal }}>
      {children}
      {request?.type === 'createEvent' && (
        <CreateEventFromMessageModal
          open
          onClose={closeModal}
          source={request.source}
          prefill={request.prefill}
          onCreated={handleEntityCreated('meeting')}
        />
      )}
      {request?.type === 'createReminder' && (
        <CreateReminderFromMessageModal
          open
          onClose={closeModal}
          source={request.source}
          prefill={request.prefill}
          onCreated={handleEntityCreated('reminder')}
        />
      )}
      {request?.type === 'createTask' && (
        <CreateTaskFromMessageModal
          open
          onClose={closeModal}
          source={request.source}
          prefill={request.prefill}
          onCreated={handleEntityCreated('task')}
        />
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