'use client';

import { Suspense } from 'react';
import { Chat } from 'stream-chat-react';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { Spinner } from '@/components/ui/spinner';
import { IconAlertCircle } from '@/components/ui/icons';
import { WorkspaceProvider } from './workspace-context';
import { WorkspaceLayout } from './workspace-layout';

function CenterState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      {children}
    </div>
  );
}

export function Workspace() {
  const { client, isLoading, error } = useStreamChatContext();

  if (isLoading) {
    return (
      <CenterState>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Spinner size={32} className="text-blue-600" />
          <span className="text-sm">Connecting to chat…</span>
        </div>
      </CenterState>
    );
  }

  if (error) {
    return (
      <CenterState>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-6 text-center">
          <IconAlertCircle width={28} height={28} className="text-red-500" />
          <p className="text-sm font-medium text-red-700">Chat connection failed</p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      </CenterState>
    );
  }

  if (!client || !client.userID) {
    return (
      <CenterState>
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <p className="text-sm">No active chat session.</p>
        </div>
      </CenterState>
    );
  }

  return (
    <Chat client={client}>
      <Suspense
        fallback={
          <CenterState>
            <Spinner size={32} className="text-blue-600" />
          </CenterState>
        }
      >
        <WorkspaceProvider>
          <WorkspaceLayout />
        </WorkspaceProvider>
      </Suspense>
    </Chat>
  );
}