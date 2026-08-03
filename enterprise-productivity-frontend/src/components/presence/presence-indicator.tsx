'use client';

interface PresenceIndicatorProps {
  online?: boolean;
  lastSeen?: string | null;
  isLoading?: boolean;
  error?: string | null;
  variant?: 'full' | 'compact';
}

export function PresenceIndicator({
  online,
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

  if (online) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <span aria-hidden>🟢</span>
        {variant === 'full' && 'Online'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <span aria-hidden>⚪</span>
      {variant === 'full' &&
        (lastSeen ? 'Last seen recently' : 'Offline')}
    </span>
  );
}