'use client';

import { MessageActions } from 'stream-chat-react';
import type { ComponentProps } from 'react';
import type { BaseSyntheticEvent } from 'react';

type MessageActionsComponentProps = ComponentProps<typeof MessageActions>;

function MessageActionsWithConfirm(props: MessageActionsComponentProps) {
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

  return (
    <MessageActions
      {...props}
      {...(confirmingHandleDelete
        ? { handleDelete: confirmingHandleDelete }
        : {})}
    />
  );
}

export { MessageActionsWithConfirm };
