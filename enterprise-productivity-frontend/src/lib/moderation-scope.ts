import type { UserRole } from './api-client';

/**
 * Whether the current user may perform a moderation action on a channel.
 * Mirrors the backend `ModerationService.channelScope` for the UI:
 * platform roles moderate everywhere; managers / team leads moderate
 * channels they created or assist in (`is_moderator` / `channel_role`).
 * The server re-checks permission on every request.
 */
export function canModerateChannel(
  role: UserRole | string | null | undefined,
  createdBy: string | undefined,
  member:
    | { is_moderator?: boolean; channel_role?: string }
    | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!currentUserId) return false;

  if (role === 'super_admin' || role === 'organization_owner' || role === 'admin') {
    return true;
  }
  if (role !== 'manager' && role !== 'team_lead') return false;

  if (createdBy === currentUserId) return true;
  if (member?.is_moderator) return true;
  const channelRole = member?.channel_role;
  return channelRole === 'channel_moderator' || channelRole === 'moderator';
}