'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ContextMenuButton,
  useContextMenuContext,
  useMessageContext,
  useChannelStateContext,
} from 'stream-chat-react';
import {
  createBookmark,
  deleteBookmark,
  fetchBookmarkByMessage,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import {
  IconBookmark,
  IconCalendarPlus,
  IconClock,
  IconNote,
  IconPoll,
} from '@/components/ui/icons';
import { buildSourceRef, channelName } from './source-message';
import { useMessageActionModalHost } from './message-action-modal-host';

export function CreateEventActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { can } = useRole();
  const { openModal } = useMessageActionModalHost();

  if (!can('create_meeting')) return null;

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Create calendar event"
      Icon={IconCalendarPlus}
      onClick={() => {
        closeMenu();
        openModal('createEvent', buildSourceRef(message, channel));
      }}
    >
      Create event
    </ContextMenuButton>
  );
}

export function CreateReminderActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { openModal } = useMessageActionModalHost();

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Create reminder"
      Icon={IconClock}
      onClick={() => {
        closeMenu();
        openModal('createReminder', buildSourceRef(message, channel));
      }}
    >
      Create reminder
    </ContextMenuButton>
  );
}

export function SaveAsNoteActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { openModal } = useMessageActionModalHost();

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Save as note"
      Icon={IconNote}
      onClick={() => {
        closeMenu();
        openModal('saveAsNote', buildSourceRef(message, channel));
      }}
    >
      Save as note
    </ContextMenuButton>
  );
}

export function CreatePollActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { can } = useRole();
  const { openModal } = useMessageActionModalHost();

  if (!can('create_meeting')) return null;

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Create poll"
      Icon={IconPoll}
      onClick={() => {
        closeMenu();
        openModal('createPoll', buildSourceRef(message, channel));
      }}
    >
      Create poll
    </ContextMenuButton>
  );
}

export function BookmarkMessageActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  async function handleToggle() {
    const token = await getToken();
    if (!token || !message.id) return;
    setIsBusy(true);
    try {
      const existing = await fetchBookmarkByMessage(token, message.id);
      if (existing) {
        await deleteBookmark(token, existing.id);
        showToast('Bookmark removed.');
      } else {
        await createBookmark(token, {
          sourceChannelId: channel.id ?? '',
          sourceMessageId: message.id,
          sourceSenderId: message.user?.id,
          sourceChannelName: channelName(channel),
          sourceSenderName: message.user?.name,
          sourceMessageText: message.text,
        });
        showToast('Message bookmarked.');
      }
      closeMenu();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update bookmark.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Bookmark message"
      disabled={isBusy}
      Icon={IconBookmark}
      onClick={() => void handleToggle()}
    >
      Bookmark message
    </ContextMenuButton>
  );
}
