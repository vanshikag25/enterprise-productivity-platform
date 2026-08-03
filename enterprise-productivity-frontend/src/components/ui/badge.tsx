import type { HTMLAttributes } from 'react';

export type BadgeVariant =
  | 'blue'
  | 'indigo'
  | 'green'
  | 'amber'
  | 'red'
  | 'gray'
  | 'violet'
  | 'cyan';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  blue: 'badge-blue',
  indigo: 'badge-indigo',
  green: 'badge-green',
  amber: 'badge-amber',
  red: 'badge-red',
  gray: 'badge-gray',
  violet: 'badge-violet',
  cyan: 'badge-cyan',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = 'gray',
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`badge ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
