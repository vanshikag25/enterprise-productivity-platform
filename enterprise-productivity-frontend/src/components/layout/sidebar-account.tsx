'use client';

import { useState } from 'react';
import { useClerk, useUser } from '@/lib/auth';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { IconLogout } from '@/components/ui/icons';
import { useRole } from '@/hooks/use-role';
import { USER_ROLE_LABELS } from '@/lib/api-client';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { StatusDot } from '@/components/presence/status-dot';
import { resolveUserStatus } from '@/lib/user-status';

interface SidebarAccountProps {
  collapsed: boolean;
}

export function SidebarAccount({ collapsed }: SidebarAccountProps) {
  const { user, isLoaded } = useUser();
  const { role, me } = useRole();
  const { client } = useStreamChatContext();
  const { signOut } = useClerk();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const name = user?.fullName ?? user?.username ?? me?.firstName ?? 'User';
  const email =
    user?.primaryEmailAddress?.emailAddress ?? me?.email ?? '';
  const imageUrl = user?.imageUrl ?? me?.imageUrl ?? null;
  const roleLabel = role ? USER_ROLE_LABELS[role] : null;
  const myStatus = resolveUserStatus(
    client?.user?.online ?? true,
    me?.status ?? null,
  );

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut({ redirectUrl: '/sign-in' });
    } catch {
      setIsLoggingOut(false);
    }
  }

  const logoutButton = (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut || !isLoaded}
      aria-label="Logout"
      title="Logout"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      {isLoggingOut ? (
        <Spinner size={16} />
      ) : (
        <IconLogout width={16} height={16} />
      )}
    </button>
  );

  return (
    <div className="border-t border-white/10 p-3">
      {collapsed ? (
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative">
            <Avatar name={name} imageUrl={imageUrl} size="sm" />
            <StatusDot
              status={myStatus}
              size="sm"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          {logoutButton}
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <Avatar name={name} imageUrl={imageUrl} size="md" />
            <StatusDot
              status={myStatus}
              size="md"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-slate-400">
              {email || (roleLabel ?? 'No email')}
            </p>
            {roleLabel && (
              <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                {roleLabel}
              </span>
            )}
          </div>
          {logoutButton}
        </div>
      )}
    </div>
  );
}
