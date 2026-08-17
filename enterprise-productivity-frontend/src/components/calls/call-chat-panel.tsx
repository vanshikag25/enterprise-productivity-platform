'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/lib/auth';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { IconClose, IconSend } from '@/components/ui/icons';

interface ChatMessage {
  id?: string;
  text?: string;
  created_at?: string | Date;
  user?: { id?: string; name?: string; image?: string } | null;
}

interface CallChatPanelProps {
  channelId: string;
  onClose: () => void;
}

export function CallChatPanel({ channelId, onClose }: CallChatPanelProps) {
  const { client } = useStreamChatContext();
  const { user } = useUser();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const channel = client.channel('messaging', channelId);

    (async () => {
      try {
        if (cancelled) return;
        setIsLoading(true);
        await channel.watch();
        if (cancelled) return;
        setMessages(channel.state.messages as unknown as ChatMessage[]);
        const subscription = channel.on('message.new', () => {
          setMessages(channel.state.messages as unknown as ChatMessage[]);
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch {
        if (!cancelled) {
          showToast('Could not open the call chat', 'error');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      void channel.stopWatching();
    };
  }, [client, channelId, showToast]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !client) return;
    try {
      const channel = client.channel('messaging', channelId);
      await channel.sendMessage({ text: trimmed });
      setMessages([...channel.state.messages]);
      setText('');
    } catch {
      showToast('Could not send the message', 'error');
    }
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-white/10 bg-slate-900">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <p className="text-sm font-semibold">Call chat</p>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconClose width={16} height={16} />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading && (
          <p className="text-center text-xs text-slate-500">Loading messages…</p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-xs text-slate-500">
            No messages in this conversation yet.
          </p>
        )}
        {messages.map((message) => {
          const isMine = message.user?.id === user?.id;
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              {!isMine && (
                <span className="mb-0.5 px-1 text-[11px] text-slate-400">
                  {message.user?.name ?? message.user?.id ?? 'Unknown'}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                  isMine
                    ? 'rounded-br-sm bg-blue-600 text-white'
                    : 'rounded-bl-sm bg-white/10 text-slate-100'
                }`}
              >
                {message.text}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Message the conversation"
          className="h-9 min-w-0 flex-1 rounded-lg bg-white/10 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-2 focus:outline-blue-500"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          className="h-9 w-9 rounded-lg"
          aria-label="Send"
          disabled={!text.trim()}
        >
          <IconSend width={16} height={16} />
        </Button>
      </form>
    </aside>
  );
}
