import type { ReactionOptions } from 'stream-chat-react';

export const reactionOptions: ReactionOptions = [
  { type: 'thumbsup', Component: () => <>👍</>, name: 'Thumbs Up' },
  { type: 'heart', Component: () => <>❤️</>, name: 'Heart' },
  { type: 'joy', Component: () => <>😂</>, name: 'Joy' },
  { type: 'heart_eyes', Component: () => <>😍</>, name: 'Heart Eyes' },
  { type: 'open_mouth', Component: () => <>😮</>, name: 'Surprised' },
  { type: 'cry', Component: () => <>😢</>, name: 'Crying' },
  { type: 'rage', Component: () => <>😡</>, name: 'Angry' },
  { type: 'tada', Component: () => <>🎉</>, name: 'Celebration' },
  { type: 'fire', Component: () => <>🔥</>, name: 'Fire' },
  { type: 'clap', Component: () => <>👏</>, name: 'Clap' },
  { type: 'eyes', Component: () => <>👀</>, name: 'Eyes' },
];