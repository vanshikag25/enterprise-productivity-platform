import type { Channel, LocalMessage } from 'stream-chat';

export interface SourceMessageRef {
  sourceChannelId?: string;
  sourceMessageId?: string;
  sourceSenderId?: string;
  sourceChannelName?: string;
  sourceSenderName?: string;
  sourceMessageText?: string;
}

export function messageTextSnippet(
  message: { id?: string; text?: string | null },
  maxLength = 140,
): string {
  const text = message.text ?? '';
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '(No text)';
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength).trimEnd()}…`
    : trimmed;
}

export function channelName(channel: Channel, fallback?: string | null): string {
  const data = channel.data as { name?: string } | undefined;
  return data?.name ?? fallback ?? channel.id ?? 'Unknown channel';
}

export function buildSourceRef(message: LocalMessage, channel: Channel): SourceMessageRef {
  return {
    sourceChannelId: channel.id,
    sourceMessageId: message.id,
    sourceSenderId: message.user?.id,
    sourceChannelName: channelName(channel),
    sourceSenderName: message.user?.name,
    sourceMessageText: message.text,
  };
}
