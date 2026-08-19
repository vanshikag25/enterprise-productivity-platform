'use client';

import type { Channel as StreamChannel } from 'stream-chat';

export type ChannelKind =
  | 'organization'
  | 'department'
  | 'announcement'
  | 'task'
  | 'project'
  | 'milestone'
  | 'direct';

export interface ChannelSectionGroup {
  dms: StreamChannel[];
  teams: StreamChannel[];
  announcements: StreamChannel[];
  archived: StreamChannel[];
  other: StreamChannel[];
}

const EXCLUDED_KINDS = new Set(['task', 'project', 'milestone']);

function isMeetingChannel(channel: StreamChannel): boolean {
  const data = channel.data as { name?: string } | undefined;
  return Boolean(data?.name?.startsWith('Meeting: '));
}

function kindOf(channel: StreamChannel): string | null {
  const data = channel.data as { channel_kind?: string } | undefined;
  return data?.channel_kind ?? null;
}

function isFrozen(channel: StreamChannel): boolean {
  const data = channel.data as { frozen?: boolean } | undefined;
  return Boolean(data?.frozen);
}

function hasName(channel: StreamChannel): boolean {
  const data = channel.data as { name?: string } | undefined;
  return Boolean(data?.name);
}

/**
 * Partition the user's channels into workspace sections.
 *
 * - Direct Messages: 2-member conversations with no name and no channel kind.
 * - Teams: named group channels plus organization / department channels.
 * - Announcements: channels with kind `announcement`.
 * - Archived: frozen channels (read-only history).
 * - `other`: channels surfaced under Projects/Tasks sections (task/project/
 *   milestone) so they do not clutter the channel sections.
 */
export function partitionChannels(channels: StreamChannel[]): ChannelSectionGroup {
  const groups: ChannelSectionGroup = {
    dms: [],
    teams: [],
    announcements: [],
    archived: [],
    other: [],
  };

  for (const channel of channels) {
    const kind = kindOf(channel);
    if (isFrozen(channel)) {
      groups.archived.push(channel);
      continue;
    }
    if (kind === 'announcement') {
      groups.announcements.push(channel);
      continue;
    }
    if (kind && EXCLUDED_KINDS.has(kind)) {
      groups.other.push(channel);
      continue;
    }
    if (isMeetingChannel(channel)) {
      groups.other.push(channel);
      continue;
    }
    if (hasName(channel) || kind === 'organization' || kind === 'department') {
      groups.teams.push(channel);
      continue;
    }
    groups.dms.push(channel);
  }

  return groups;
}
