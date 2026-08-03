'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageComposer,
  Thread,
  WithComponents,
  useChatContext,
  LoadingIndicator,
} from 'stream-chat-react';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { SingleChoiceReactionSelector } from '@/components/chat/single-choice-reaction-selector';
import { MessageActionsWithConfirm } from '@/components/chat/message-actions-with-confirm';
import { TypingIndicatorText } from '@/components/chat/typing-indicator-text';

function ProjectChannelViewer({ channelId }: { channelId: string }) {
  const { client, channel, setActiveChannel } = useChatContext();
  const [isOpening, setIsOpening] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsOpening(true);

    async function open() {
      if (!client) return;
      try {
        const target = client.channel('messaging', channelId);
        await target.watch();
        if (!cancelled) {
          setActiveChannel(target);
        }
      } catch {
        // The failure state is rendered below when channel.id mismatches.
      } finally {
        if (!cancelled) setIsOpening(false);
      }
    }

    open();

    return () => {
      cancelled = true;
    };
  }, [channelId, client, setActiveChannel]);

  if (isOpening) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingIndicator className="h-8 w-8" />
      </div>
    );
  }

  if (!channel || channel.id !== channelId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        Unable to open the project channel.
      </div>
    );
  }

  return (
    <WithComponents
      overrides={{
        ReactionSelector: SingleChoiceReactionSelector,
        MessageActions: MessageActionsWithConfirm,
      }}
    >
      <Channel>
        <Window>
          <ChannelHeader />
          <MessageList />
          <TypingIndicatorText />
          <MessageComposer audioRecordingEnabled />
        </Window>
        <Thread />
      </Channel>
    </WithComponents>
  );
}

interface ProjectChatTabProps {
  channelId: string | null;
}

export function ProjectChatTab({ channelId }: ProjectChatTabProps) {
  const { client, isLoading, error } = useStreamChatContext();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-gray-500">
        <LoadingIndicator className="h-10 w-10" />
        Connecting…
      </div>
    );
  }

  if (error || !client || !client.userID) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        {error ?? 'No active chat session.'}
      </div>
    );
  }

  if (!channelId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        This project has no chat channel yet.
      </div>
    );
  }

  return (
    <Chat client={client}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <LoadingIndicator className="h-8 w-8" />
          </div>
        }
      >
        <ProjectChannelViewer channelId={channelId} />
      </Suspense>
    </Chat>
  );
}
