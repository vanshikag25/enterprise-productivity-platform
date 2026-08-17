'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  deleteModerationMessage,
  muteModerationUser,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { canModerateChannel } from '@/lib/moderation-scope';
import {
  ContextMenuButton,
  useContextMenuContext,
  useMessageContext,
  useChannelStateContext,
  useChatContext,
} from 'stream-chat-react';
import { IconAlertTriangle, IconTrash, IconUser } from '@/components/ui/icons';
import { messageTextSnippet, channelName } from './source-message';
import { ReportMessageModal } from './report-message-modal';

/**
 * Report the current message's author to moderators. Available to everyone.
 */
export function ReportUserActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const [open, setOpen] = useState(false);

  if (!message.user?.id) return null;

  return (
    <>
      <ContextMenuButton
        className="str-chat__message-actions-list-item-button"
        aria-label="Report this user"
        Icon={IconAlertTriangle}
        onClick={() => {
          closeMenu();
          setOpen(true);
        }}
      >
        Report this member
      </ContextMenuButton>
      {open && (
        <ReportMessageModal
          open
          onClose={() => setOpen(false)}
          targetType="user"
          channelId={channel.id}
          channelName={channelName(channel)}
          targetUserId={message.user.id}
          targetMessageId={message.id}
          reportedBy={`@${message.user.name ?? message.user.id}`}
        />
      )}
    </>
  );
}

/**
 * Report the current message to moderators. Available to everyone.
 */
export function ReportMessageActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const [open, setOpen] = useState(false);

  if (!message.id || !channel.id) return null;

  return (
    <>
      <ContextMenuButton
        className="str-chat__message-actions-list-item-button"
        aria-label="Report this message"
        Icon={IconAlertTriangle}
        onClick={() => {
          closeMenu();
          setOpen(true);
        }}
      >
        Report message
      </ContextMenuButton>
      {open && (
        <ReportMessageModal
          open
          onClose={() => setOpen(false)}
          targetType="message"
          channelId={channel.id}
          channelName={channelName(channel)}
          targetMessageId={message.id}
          preview={messageTextSnippet(message)}
          reportedBy={`@${message.user?.name ?? message.user?.id ?? 'unknown'}`}
        />
      )}
    </>
  );
}

/**
 * Moderator-only: hard-delete a message from the server and record an action.
 * Visible for team leads+ who can moderate this channel, on others' messages.
 */
export function ModeratorDeleteActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { role } = useRole();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  const currentUserId = client?.userID ?? null;

  if (currentUserId === null || message.user?.id === currentUserId) return null;
  if (!channel?.id || !message.id) return null;

  const data = (channel.data ?? {}) as { created_by_id?: string };
  const member = (channel.state?.members ?? {})[currentUserId] as
    | { is_moderator?: boolean; channel_role?: string }
    | undefined;

  if (!canModerateChannel(role, data.created_by_id, member, currentUserId)) {
    return null;
  }

  const handleDelete = async () => {
    closeMenu();
    const confirmed = window.confirm('Delete this message? This action is logged and cannot be undone.');
    if (!confirmed) return;
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteModerationMessage(token, message.id!);
      channel.state?.removeMessage({ id: message.id! });
      showToast('Message deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete message.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Delete message (moderation)"
      disabled={isBusy}
      Icon={IconTrash}
      onClick={() => void handleDelete()}
    >
      Delete (moderation)
    </ContextMenuButton>
  );
}

/**
 * Moderator-only: mute the message author in this channel.
 * Visible for team leads+ who can moderate this channel, on others' messages.
 */
export function MuteUserActionItem() {
  const { closeMenu } = useContextMenuContext();
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { role } = useRole();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  const currentUserId = client?.userID ?? null;

  const channelId = channel.id;
  const targetUserId = message.user?.id;

  if (currentUserId === null || !targetUserId || targetUserId === currentUserId) return null;
  if (!channelId) return null;

  const data = (channel.data ?? {}) as { created_by_id?: string };
  const member = (channel.state?.members ?? {})[currentUserId] as
    | { is_moderator?: boolean; channel_role?: string }
    | undefined;

  if (!canModerateChannel(role, data.created_by_id, member, currentUserId)) {
    return null;
  }

  const handleMute = async () => {
    closeMenu();
    const input = window.prompt(
      `Mute ${message.user?.name ?? message.user?.id} in this channel for how long (minutes)?`,
      '60',
    );
    if (input === null) return;
    const minutes = Math.max(1, Math.round(Number(input) || 0));
    setIsBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await muteModerationUser(token, {
        channelId,
        targetUserId: targetUserId!,
        durationMinutes: minutes,
        reason: 'Moderator action',
      });
      showToast(`${message.user?.name ?? message.user?.id} muted for ${minutes} minute${minutes === 1 ? '' : 's'}.`);
      closeMenu();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to mute user.', 'error');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ContextMenuButton
      className="str-chat__message-actions-list-item-button"
      aria-label="Mute this member"
      disabled={isBusy}
      Icon={IconUser}
      onClick={() => void handleMute()}
    >
      Mute member
    </ContextMenuButton>
  );
}