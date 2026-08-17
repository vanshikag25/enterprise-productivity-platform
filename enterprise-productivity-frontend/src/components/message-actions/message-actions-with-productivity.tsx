'use client';

import { useMemo } from 'react';
import { MessageActions, defaultMessageActionSet } from 'stream-chat-react';
import type { ComponentProps } from 'react';
import type { BaseSyntheticEvent } from 'react';
import type { MessageActionSetItem } from 'stream-chat-react';
import {
  BookmarkMessageActionItem,
  CreateEventActionItem,
  CreatePollActionItem,
  CreateReminderActionItem,
  SaveAsNoteActionItem,
  TranslateMessageActionItem,
} from './message-action-items';
import {
  ModeratorDeleteActionItem,
  MuteUserActionItem,
  ReportMessageActionItem,
  ReportUserActionItem,
} from './moderation-action-items';

type MessageActionsComponentProps = ComponentProps<typeof MessageActions>;

const PRODUCTIVITY_ACTION_SET: MessageActionSetItem[] = [
  { type: 'createEvent', Component: CreateEventActionItem, placement: 'dropdown' },
  { type: 'createReminder', Component: CreateReminderActionItem, placement: 'dropdown' },
  { type: 'saveAsNote', Component: SaveAsNoteActionItem, placement: 'dropdown' },
  { type: 'bookmarkMessage', Component: BookmarkMessageActionItem, placement: 'dropdown' },
  { type: 'createPoll', Component: CreatePollActionItem, placement: 'dropdown' },
  { type: 'translateMessage', Component: TranslateMessageActionItem, placement: 'dropdown' },
  { type: 'reportMessage', Component: ReportMessageActionItem, placement: 'dropdown' },
  { type: 'reportUser', Component: ReportUserActionItem, placement: 'dropdown' },
  { type: 'moderatorDelete', Component: ModeratorDeleteActionItem, placement: 'dropdown' },
  { type: 'muteUser', Component: MuteUserActionItem, placement: 'dropdown' },
];

function MessageActionsWithProductivity(props: MessageActionsComponentProps) {
  const propsWithHandlers = props as MessageActionsComponentProps & {
    handleDelete?: (event: BaseSyntheticEvent) => Promise<void> | void;
  };

  const originalHandleDelete = propsWithHandlers.handleDelete;

  const confirmingHandleDelete = originalHandleDelete
    ? async (event: BaseSyntheticEvent) => {
        const confirmed = window.confirm(
          'Delete this message? This cannot be undone.',
        );
        if (!confirmed) return;
        await originalHandleDelete(event);
      }
    : undefined;

  const messageActionSet = useMemo(
    () => [...defaultMessageActionSet, ...PRODUCTIVITY_ACTION_SET],
    [],
  );

  return (
    <MessageActions
      {...props}
      messageActionSet={messageActionSet}
      {...(confirmingHandleDelete
        ? { handleDelete: confirmingHandleDelete }
        : {})}
    />
  );
}

export { MessageActionsWithProductivity };
