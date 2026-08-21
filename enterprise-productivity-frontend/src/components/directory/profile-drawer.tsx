'use client';

import type { UserDirectoryItem } from '@/lib/api-client';
import type { LivePresence } from '@/hooks/use-live-presence';
import { formatJoinedDate } from '@/lib/format-date';
import { PresenceIndicator } from '@/components/presence/presence-indicator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { IconClose, IconMessageCircle } from '@/components/ui/icons';

interface ProfileDrawerProps {
  user: UserDirectoryItem | null;
  presence?: LivePresence;
  isPresenceLoading?: boolean;
  presenceError?: string | null;
  onClose: () => void;
  onMessage: (user: UserDirectoryItem) => void;
}

export function ProfileDrawer({
  user,
  presence,
  isPresenceLoading,
  presenceError,
  onClose,
  onMessage,
}: ProfileDrawerProps) {
  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          <button onClick={onClose} aria-label="Close" className="btn-icon btn-ghost rounded-lg text-slate-400 hover:text-slate-600">
            <IconClose width={18} height={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-5 pt-6 text-center">
          <div className="brand-gradient rounded-full p-1">
            <Avatar name={user.name} imageUrl={user.imageUrl} size="xl" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <PresenceIndicator
            online={presence?.online ?? user.online}
            manualStatus={presence?.status ?? user.status}
            lastSeen={presence?.lastActive ?? user.lastSeen}
            isLoading={isPresenceLoading && !presence}
            error={presenceError}
          />
        </div>

        <dl className="mx-5 mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
          {user.department && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Department</dt>
              <dd className="text-right text-slate-800">{user.department}</dd>
            </div>
          )}
          {user.organization && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Organization</dt>
              <dd className="text-right text-slate-800">{user.organization}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Joined</dt>
            <dd className="text-slate-800">{formatJoinedDate(user.joinedAt)}</dd>
          </div>
        </dl>

        <div className="p-5">
          <Button className="w-full" onClick={() => onMessage(user)}>
            <IconMessageCircle width={16} height={16} />
            Direct Message
          </Button>
        </div>
      </div>
    </div>
  );
}
