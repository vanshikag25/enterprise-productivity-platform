'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useChatContext } from 'stream-chat-react';
import { useWorkspace } from './workspace-context';
import { WorkspaceSidebar } from './workspace-sidebar';
import { WorkspaceCenter } from './workspace-center';
import { IconMenu } from '@/components/ui/icons';

export function WorkspaceLayout() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useWorkspace();

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Drawer backdrop for the mobile navigation */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left sidebar */}
      <aside
        aria-label="Workspace navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-72'} w-72`}
      >
        <WorkspaceSidebar />
      </aside>

      {/* Center panel */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white/80 px-3 py-1.5">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open workspace navigation"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <IconMenu width={18} height={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <WorkspaceCenter />
        </div>
      </main>

      <ChannelLinkHandler />
    </div>
  );
}

/**
 * Watches the URL for deep links (`?channel=` + optional `?message=`), used by
 * notifications, bookmarks, and entity "Open Discussion" actions. Opens the
 * requested channel and switches the workspace into channel mode.
 */
function ChannelLinkHandler() {
  const { client, setActiveChannel } = useChatContext();
  const { selectChannel } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openedChannelRef = useRef<string | null>(null);

  const requestedChannelId = searchParams.get('channel');
  const requestedMessageId = searchParams.get('message');

  useEffect(() => {
    if (!requestedChannelId || !client) return;
    if (openedChannelRef.current === requestedChannelId) return;

    let isCancelled = false;

    async function openRequestedChannel() {
      const targetChannel = client.channel('messaging', requestedChannelId!);
      await targetChannel.watch();

      if (!isCancelled) {
        setActiveChannel(targetChannel);
        if (targetChannel.id) selectChannel(targetChannel.id);
        openedChannelRef.current = requestedChannelId;
        // Leave the `message` param in place so JumpToMessage can navigate;
        // it clears the URL itself once the jump completes.
        if (!requestedMessageId) router.replace(pathname);
      }
    }

    openRequestedChannel();

    return () => {
      isCancelled = true;
    };
  }, [requestedChannelId, requestedMessageId, client, setActiveChannel, selectChannel, router, pathname]);

  return null;
}