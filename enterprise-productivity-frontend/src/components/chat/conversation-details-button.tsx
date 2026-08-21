'use client';

import { useState } from 'react';
import { ChannelAvatar, type ChannelAvatarProps } from 'stream-chat-react';
import { ConversationDetailsDrawer } from './conversation-details-drawer';

/**
 * Clickable channel avatar shown in the chat header. Clicking it opens the
 * conversation details drawer (the other user's profile for 1:1 chats, or the
 * channel info for group chats). Clicking it again or clicking outside the
 * drawer closes it.
 */
export function ConversationDetailsButton(props: ChannelAvatarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close details' : 'Open details'}
        title="Details"
        className="cursor-pointer shrink-0 rounded-full border-0 bg-transparent p-0 transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <ChannelAvatar {...props} />
      </button>
      {open && <ConversationDetailsDrawer onClose={() => setOpen(false)} />}
    </>
  );
}