'use client';

import type { UserStatus } from '@/lib/user-status';
import { STATUS_META } from '@/lib/user-status';

interface StatusDotProps {
  status?: UserStatus | null;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
} as const;

export function StatusDot({
  status,
  size = 'md',
  ring = true,
  className,
}: StatusDotProps) {
  const dotClass = status ? STATUS_META[status].dotClass : 'bg-slate-200';
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${SIZE_CLASSES[size]} ${dotClass} ${
        ring ? 'ring-2 ring-white' : ''
      } ${className ?? ''}`}
    />
  );
}