'use client';

import type { UserDirectoryItem } from '@/lib/api-client';
import type { LivePresence } from '@/hooks/use-live-presence';
import { PresenceIndicator } from '@/components/presence/presence-indicator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { IconMessageCircle, IconPlus, IconUser } from '@/components/ui/icons';

interface UserCardProps {
  user: UserDirectoryItem;
  presence?: LivePresence;
  isPresenceLoading?: boolean;
  presenceError?: string | null;
  isMessaging: boolean;
  onMessage: (user: UserDirectoryItem) => void;
  onAddToGroup: (user: UserDirectoryItem) => void;
  onViewProfile: (user: UserDirectoryItem) => void;
}

export function UserCard({
  user,
  presence,
  isPresenceLoading,
  presenceError,
  isMessaging,
  onMessage,
  onAddToGroup,
  onViewProfile,
}: UserCardProps) {
  return (
    <div className="card card-hover flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar name={user.name} imageUrl={user.imageUrl} size="lg" />
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
              presence?.online ? 'bg-green-500' : 'bg-slate-200'
            }`}
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <PresenceIndicator
            online={presence?.online}
            lastSeen={presence?.lastActive}
            isLoading={isPresenceLoading && !presence}
            error={presenceError}
          />
        </div>
      </div>

      <div className="flex min-w-0 gap-2">
        <Button size="sm" className="min-w-0 flex-1" onClick={() => onMessage(user)} disabled={isMessaging}>
          <IconMessageCircle width={14} height={14} className="shrink-0" />
          <span className="truncate">{isMessaging ? '…' : 'Message'}</span>
        </Button>
        <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={() => onAddToGroup(user)}>
          <IconPlus width={14} height={14} className="shrink-0" />
          <span className="truncate">Add to Group</span>
        </Button>
        <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={() => onViewProfile(user)}>
          <IconUser width={14} height={14} className="shrink-0" />
          <span className="truncate">Profile</span>
        </Button>
      </div>
    </div>
  );
}
