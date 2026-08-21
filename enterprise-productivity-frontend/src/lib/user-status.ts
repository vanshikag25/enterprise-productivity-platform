export type UserStatus =
  | 'online'
  | 'away'
  | 'busy'
  | 'in_meeting'
  | 'dnd'
  | 'offline';

export const MANUAL_STATUSES = ['away', 'busy', 'in_meeting', 'dnd'] as const;
export type ManualStatus = (typeof MANUAL_STATUSES)[number];

export interface StatusMeta {
  label: string;
  dotClass: string;
  textClass: string;
}

export const STATUS_META: Record<UserStatus, StatusMeta> = {
  online: {
    label: 'Online',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600',
  },
  away: {
    label: 'Away',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600',
  },
  busy: {
    label: 'Busy',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-600',
  },
  in_meeting: {
    label: 'In a Meeting',
    dotClass: 'bg-violet-500',
    textClass: 'text-violet-600',
  },
  dnd: {
    label: 'Do Not Disturb',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-400',
  },
};

export function isManualStatus(
  value: string | null | undefined,
): value is ManualStatus {
  return value != null && (MANUAL_STATUSES as readonly string[]).includes(value);
}

export function resolveUserStatus(
  online: boolean,
  manualStatus: string | null | undefined,
): UserStatus {
  if (!online) return 'offline';
  if (isManualStatus(manualStatus)) return manualStatus;
  return 'online';
}