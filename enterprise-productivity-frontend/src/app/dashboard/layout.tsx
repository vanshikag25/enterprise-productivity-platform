import { StreamChatProvider } from '@/context/stream-chat-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StreamChatProvider>{children}</StreamChatProvider>;
}
