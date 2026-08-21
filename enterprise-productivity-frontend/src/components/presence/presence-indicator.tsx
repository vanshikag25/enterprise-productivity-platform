'use client';

import type { UserStatus } from '@/lib/user-status';
import { resolveUserStatus, STATUS_META } from '@/lib/user-status';
import { StatusDot } from './status-dot';

interface PresenceIndicatorProps {
  status?: UserStatus;
  online?: boolean;
  manualStatus?: string | null;
  lastSeen?: string | null;
  isLoading?: boolean;
  error?: string | null;
  variant?: 'full' | 'compact';
}

export function PresenceIndicator({
  status,
  online,
  manualStatus,
  lastSeen,
  isLoading,
  error,
  variant = 'full',
}: PresenceIndicatorProps) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" />
        {variant === 'full' && 'Checking status…'}
      </span>
    );
  }

  if (error) {
    return (
      <span className="text-xs text-gray-400">Presence unavailable</span>
    );
  }

  const resolved: UserStatus =
    status ??
    (online !== undefined ? resolveUserStatus(Boolean(online), manualStatus) : 'offline');

  const meta = STATUS_META[resolved];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.textClass}`}>
      <StatusDot status={resolved} size="sm" ring={false} />
      {variant === 'full' &&
        (resolved === 'offline' && lastSeen
          ? 'Last seen recently'
          : meta.label)}
    </span>
  );
}