import { StreamChatProvider } from '@/context/stream-chat-context';

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StreamChatProvider>{children}</StreamChatProvider>;
}
