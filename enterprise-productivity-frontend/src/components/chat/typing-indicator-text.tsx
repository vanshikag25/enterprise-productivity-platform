'use client';

import { useTypingContext, useChatContext } from 'stream-chat-react';

export function TypingIndicatorText() {
  const { typing } = useTypingContext();
  const { client } = useChatContext();

  const typingUsers = Object.values(typing ?? {})
    .map((event) => event.user)
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .filter((user) => user.id !== client?.userID);

  if (typingUsers.length === 0) {
    return <div className="h-5" aria-hidden />;
  }

  const names = typingUsers.map((u) => u.name || u.id);

  let text: string;
  if (names.length === 1) {
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else {
    text = `${names.length} people are typing...`;
  }

  return (
    <div
      className="h-5 truncate px-4 text-xs italic text-gray-400"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
