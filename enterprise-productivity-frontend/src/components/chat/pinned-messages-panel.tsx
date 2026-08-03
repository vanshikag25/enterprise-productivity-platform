'use client';

import { useEffect, useState } from 'react';
import { useChannelStateContext } from 'stream-chat-react';
import { scrollToMessage } from './scroll-to-message';

interface PinnedMessagesPanelProps {
  onClose: () => void;
}

export function PinnedMessagesPanel({ onClose }: PinnedMessagesPanelProps) {
  const { channel } = useChannelStateContext();
  const [pinnedMessages, setPinnedMessages] = useState(
    channel?.state?.pinnedMessages ?? [],
  );

  useEffect(() => {
    if (!channel) return;

    function refresh() {
      setPinnedMessages([...(channel.state.pinnedMessages ?? [])]);
    }

    refresh();

    channel.on('message.updated', refresh);
    channel.on('message.new', refresh);
    channel.on('message.deleted', refresh);

    return () => {
      channel.off('message.updated', refresh);
      channel.off('message.new', refresh);
      channel.off('message.deleted', refresh);
    };
  }, [channel]);

  return (
    <div className="absolute inset-y-0 right-0 z-40 w-full max-w-xs overflow-y-auto border-l bg-white shadow-lg sm:w-80">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Pinned Messages</h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Close ×
        </button>
      </div>

      {pinnedMessages.length === 0 ? (
        <p className="p-4 text-xs text-gray-400">No pinned messages yet.</p>
      ) : (
        <ul>
          {pinnedMessages.map((msg) => (
            <li key={msg.id} className="border-b">
              <button
                onClick={() => scrollToMessage(msg.id)}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-xs font-medium">
                  {msg.user?.name || msg.user?.id}
                </span>
                <span className="line-clamp-2 text-xs text-gray-500">
                  {msg.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
