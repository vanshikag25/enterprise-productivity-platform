'use client';

import { useStreamChatContext } from '@/context/stream-chat-context';

export function ChatConnectionStatus() {
  const { isLoading, error, client } = useStreamChatContext();

  if (isLoading) {
    return <p className="text-sm text-gray-400">Connecting to chat…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">Chat connection failed: {error}</p>;
  }

  if (client) {
    return <p className="text-sm text-green-600">Chat connected.</p>;
  }

  return null;
}