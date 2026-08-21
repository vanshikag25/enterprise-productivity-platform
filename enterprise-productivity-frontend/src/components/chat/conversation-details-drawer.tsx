'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useChannelStateContext, useChatContext } from 'stream-chat-react';
import type { Channel } from 'stream-chat';
import { useAuth } from '@/lib/auth';
import { usePresence, type LivePresence } from '@/hooks/use-live-presence';
import {
  fetchUsersDirectory,
  fetchConversationSummaries,
  generateConversationSummary,
  setChannelLock,
  type UserDirectoryItem,
  type ConversationSummaryItem,
  type SummaryPeriodType,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { canModerateChannel } from '@/lib/moderation-scope';
import { formatJoinedDate } from '@/lib/format-date';
import { PresenceIndicator } from '@/components/presence/presence-indicator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupSettingsContent } from '@/components/chat/group-settings-drawer';
import {
  IconArchive,
  IconClock,
  IconClose,
  IconNote,
  IconPin,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconUsers,
} from '@/components/ui/icons';

interface ConversationDetailsDrawerProps {
  onClose: () => void;
}

interface MemberInfo {
  id: string;
  name: string;
  imageUrl: string | null;
  online: boolean;
  lastActive: string | null;
  status: string | null;
}

export function ConversationDetailsDrawer({
  onClose,
}: ConversationDetailsDrawerProps) {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const { getToken } = useAuth();

  const currentUserId = client?.userID ?? '';

  const members = useMemo<MemberInfo[]>(() => {
    if (!channel) return [];
    const membersObj = channel.state.members ?? {};
    return Object.entries(membersObj).map(([id, member]) => ({
      id,
      name: member.user?.name || id,
      imageUrl: member.user?.image ?? null,
      online: Boolean(member.user?.online),
      lastActive: member.user?.last_active ?? null,
      status: (() => {
        const custom = (member.user as { status?: unknown } | undefined)?.status;
        return typeof custom === 'string' ? custom : null;
      })(),
    }));
  }, [channel]);

  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId],
  );
  const isDm = otherMembers.length === 1;
  const partner = isDm ? otherMembers[0] : null;

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const {
    presence,
    isLoading: presenceLoading,
    error: presenceError,
  } = usePresence(client, memberIds);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!channel) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-slate-900">
            {isDm ? 'Profile' : 'Channel details'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-icon btn-ghost rounded-lg text-slate-400 hover:text-slate-600"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isDm && partner ? (
            <DmProfile
              partner={partner}
              presence={presence.get(partner.id)}
              isPresenceLoading={presenceLoading}
              presenceError={presenceError}
              channel={channel}
              getToken={getToken}
            />
          ) : (
            <ChannelDetailsContent
              channel={channel}
              members={members}
              presence={presence}
              currentUserId={currentUserId}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- 1:1 conversation profile ---

function DmProfile({
  partner,
  presence,
  isPresenceLoading,
  presenceError,
  channel,
  getToken,
}: {
  partner: MemberInfo;
  presence?: LivePresence;
  isPresenceLoading: boolean;
  presenceError: string | null;
  channel: Channel;
  getToken: () => Promise<string | null>;
}) {
  const [profile, setProfile] = useState<UserDirectoryItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const res = await fetchUsersDirectory(token, { limit: 200 });
        const found = res.users.find((u) => u.id === partner.id);
        if (!cancelled) setProfile(found ?? null);
      } catch {
        // Profile enrichment is optional; the drawer still shows Stream data.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partner.id, getToken]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="brand-gradient rounded-full p-1">
          <Avatar name={partner.name} imageUrl={partner.imageUrl} size="xl" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {partner.name}
          </p>
          {profile?.email && <p className="text-sm text-slate-500">{profile.email}</p>}
        </div>
        <PresenceIndicator
          online={presence?.online ?? partner.online}
          manualStatus={presence?.status ?? partner.status}
          lastSeen={presence?.lastActive ?? partner.lastActive}
          isLoading={isPresenceLoading && !presence}
          error={presenceError}
        />
      </div>

      {(profile?.department || profile?.organization || profile?.joinedAt) && (
        <dl className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
          {profile.department && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Department
              </dt>
              <dd className="text-right text-slate-800">{profile.department}</dd>
            </div>
          )}
          {profile.organization && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Organization
              </dt>
              <dd className="text-right text-slate-800">{profile.organization}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Joined
            </dt>
            <dd className="text-slate-800">{formatJoinedDate(profile.joinedAt)}</dd>
          </div>
        </dl>
      )}

      <SharedContentSection channel={channel} />
      <PinnedSection channel={channel} />
      <AiSummarySection channelId={channel?.id ?? ''} />
    </div>
  );
}

// --- Group / channel details ---

function ChannelDetailsContent({
  channel,
  members,
  presence,
  currentUserId,
  onClose,
}: {
  channel: Channel;
  members: MemberInfo[];
  presence: Map<string, LivePresence>;
  currentUserId: string;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const { role } = useRole();
  const { showToast } = useToast();
  const [isArchiving, setIsArchiving] = useState(false);

  const channelData = channel?.data as
    | {
        channel_kind?: string;
        name?: string;
        description?: string;
        created_by_id?: string;
        frozen?: boolean;
      }
    | undefined;
  const kind = channelData?.channel_kind ?? null;
  const isArchived = Boolean(channelData?.frozen);
  const isNamedGroup = Boolean(channelData?.name);

  const actorId = currentUserId;
  const myMember = (channel?.state?.members ?? {})[actorId] as
    | { is_moderator?: boolean; channel_role?: string }
    | undefined;
  const canModerate = canModerateChannel(
    role,
    channelData?.created_by_id,
    myMember,
    actorId,
  );

  async function handleToggleArchive() {
    if (!channel?.id || isArchiving) return;
    if (
      !isArchived &&
      !window.confirm('Archive this conversation? It will become read-only for everyone.')
    ) {
      return;
    }
    setIsArchiving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve session token.');
      await setChannelLock(token, {
        channelId: channel.id,
        locked: !isArchived,
      });
      showToast(isArchived ? 'Conversation unarchived.' : 'Conversation archived.');
      await channel.watch().catch(() => undefined);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update conversation.',
        'error',
      );
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Avatar name={channelData?.name ?? 'Group chat'} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            {channelData?.name ?? 'Group chat'}
          </h3>
          {kind && (
            <Badge variant="blue" className="mt-1 capitalize">
              {kind.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {channelData?.description && (
        <p className="text-sm leading-6 text-slate-600">{channelData.description}</p>
      )}

      {isArchived && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Archived conversation — read only.
        </p>
      )}

      <div>
        <SectionTitle
          icon={<IconUsers width={13} height={13} />}
          label={`Members (${members.length})`}
        />
        <ul className="mt-2 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2.5">
              <Avatar name={member.name} imageUrl={member.imageUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">
                  {member.name}
                </p>
              </div>
              <PresenceIndicator
                online={presence.get(member.id)?.online ?? member.online}
                manualStatus={presence.get(member.id)?.status ?? member.status}
                lastSeen={presence.get(member.id)?.lastActive ?? member.lastActive}
                variant="compact"
              />
            </li>
          ))}
        </ul>
      </div>

      {isNamedGroup && !isArchived && (
        <div>
          <SectionTitle
            icon={<IconSettings width={13} height={13} />}
            label="Group settings"
          />
          <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/40 p-3">
            <GroupSettingsContent onClose={onClose} />
          </div>
        </div>
      )}

      {canModerate && (
        <div>
          <SectionTitle
            icon={<IconArchive width={13} height={13} />}
            label="Conversation"
          />
          <div className="mt-2 rounded-lg border border-slate-100 p-3">
            <p className="mb-2 text-xs text-slate-500">
              {isArchived
                ? 'This conversation is archived and read-only. Unarchive it to reopen it for everyone.'
                : 'Archive this conversation to make it read-only for everyone.'}
            </p>
            <button
              type="button"
              onClick={() => void handleToggleArchive()}
              disabled={isArchiving}
              className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                isArchived
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isArchiving ? (
                <Skeleton className="h-4 w-4 rounded-full" />
              ) : isArchived ? (
                <IconRefresh width={15} height={15} />
              ) : (
                <IconArchive width={15} height={15} />
              )}
              {isArchiving
                ? 'Working…'
                : isArchived
                  ? 'Unarchive chat'
                  : 'Archive chat'}
            </button>
          </div>
        </div>
      )}

      <PinnedSection channel={channel} />
      <SharedContentSection channel={channel} />
      <AiSummarySection channelId={channel?.id ?? ''} />
      <RecentActivitySection channel={channel} members={members} />
    </div>
  );
}

// --- Shared sections ---

interface AttachmentInfo {
  name: string;
  type: string;
  url: string;
  imageUrl?: string;
}

function extractAttachments(channel: Channel | undefined): AttachmentInfo[] {
  const files: AttachmentInfo[] = [];
  const seen = new Set<string>();
  const messages = channel?.state?.messages ?? [];
  for (const message of messages) {
    const atts = message.attachments ?? [];
    for (const att of atts) {
      if (!att.title && !att.fallback && !att.asset_url && !att.image_url) {
        continue;
      }
      const key = att.title ?? att.asset_url ?? att.image_url ?? att.fallback ?? '';
      if (seen.has(key)) continue;
      seen.add(key);
      files.push({
        name: att.title ?? att.fallback ?? 'Attachment',
        type: att.type ?? 'file',
        url: att.asset_url ?? '',
        imageUrl: att.image_url ?? att.thumb_url ?? undefined,
      });
    }
  }
  return files;
}

function SharedContentSection({ channel }: { channel: Channel | undefined }) {
  const attachments = useMemo(() => extractAttachments(channel), [channel]);
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === 'image');
  const files = attachments.filter((a) => a.type !== 'image');

  return (
    <div>
      <SectionTitle
        icon={<IconNote width={13} height={13} />}
        label="Shared files & media"
      />
      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {images.slice(0, 9).map((img, idx) => (
            <a
              key={`${img.name}-${idx}`}
              href={img.url || img.imageUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square overflow-hidden rounded-lg border border-slate-100"
              title={img.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.name}
                className="h-full w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {files.slice(0, 10).map((file, idx) => (
        <a
          key={`${file.name}-${idx}`}
          href={file.url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50"
        >
          <IconNote width={14} height={14} className="shrink-0 text-slate-400" />
          <span className="truncate">{file.name}</span>
          <span className="ml-auto shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
            {file.type}
          </span>
        </a>
      ))}
    </div>
  );
}

function PinnedSection({ channel }: { channel: Channel | undefined }) {
  const pinnedMessages = channel?.state?.pinnedMessages ?? [];
  return (
    <div>
      <SectionTitle
        icon={<IconPin width={13} height={13} />}
        label={`Pinned (${pinnedMessages.length})`}
      />
      {pinnedMessages.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">No pinned messages.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {pinnedMessages.slice(0, 10).map((message) => (
            <li
              key={message.id}
              className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
            >
              <p className="line-clamp-2 text-xs text-slate-600">
                {message.user?.name ?? 'Unknown'}: {message.text ?? 'Attachment'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentActivitySection({
  channel,
  members,
}: {
  channel: Channel | undefined;
  members: MemberInfo[];
}) {
  const activity = useMemo(() => {
    const messages = channel?.state?.messages ?? [];
    const byId = new Map<string, number>();
    for (const message of messages) {
      const senderId = message.user?.id;
      if (senderId) byId.set(senderId, (byId.get(senderId) ?? 0) + 1);
    }
    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const entries = [...byId.entries()].map(([id, count]) => ({
      id,
      name: nameById.get(id) ?? id,
      count,
    }));
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 5);
  }, [channel, members]);

  if (activity.length === 0) return null;

  return (
    <div>
      <SectionTitle
        icon={<IconClock width={13} height={13} />}
        label="Recent activity"
      />
      <ul className="mt-2 space-y-1.5">
        {activity.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-slate-600">{entry.name}</span>
            <span className="shrink-0 text-slate-400">{entry.count} messages</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {icon}
      {label}
    </h3>
  );
}

function AiSummarySection({ channelId }: { channelId: string }) {
  const { getToken } = useAuth();
  const [summary, setSummary] = useState<ConversationSummaryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (periodType: SummaryPeriodType | null = null) => {
      if (!channelId) return;
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve session token.');
        let data: ConversationSummaryItem;
        if (periodType === 'daily') {
          data = await generateConversationSummary(token, {
            channelId,
            periodType: 'daily',
          });
        } else if (periodType === 'weekly') {
          data = await generateConversationSummary(token, {
            channelId,
            periodType: 'weekly',
          });
        } else {
          const existing = await fetchConversationSummaries(token, channelId);
          data = existing[0] ?? null;
        }
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load summary.');
      } finally {
        setIsLoading(false);
        setIsGenerating(false);
      }
    },
    [channelId, getToken],
  );

  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, load]);

  return (
    <div>
      <SectionTitle
        icon={<IconSparkles width={13} height={13} />}
        label="AI Summary"
      />
      {isLoading ? (
        <Skeleton className="mt-2 h-24 w-full rounded-lg" />
      ) : error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : summary ? (
        <div className="mt-2 space-y-2">
          <p className="line-clamp-4 text-xs leading-5 text-slate-600">
            {summary.overview}
          </p>
          {summary.actionItems.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                Action items
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-500">
                {summary.actionItems.slice(0, 3).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isGenerating}
              onClick={() => {
                setIsGenerating(true);
                void load('daily');
              }}
            >
              Daily
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isGenerating}
              onClick={() => {
                setIsGenerating(true);
                void load('weekly');
              }}
            >
              Weekly
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-slate-400">No summary yet.</p>
          <Button
            variant="outline"
            size="sm"
            disabled={isGenerating}
            onClick={() => {
              setIsGenerating(true);
              void load('daily');
            }}
          >
            Generate
          </Button>
        </div>
      )}
    </div>
  );
}