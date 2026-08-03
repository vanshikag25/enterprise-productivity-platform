import { StreamChatProvider } from '@/context/stream-chat-context';

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StreamChatProvider>{children}</StreamChatProvider>;
}
