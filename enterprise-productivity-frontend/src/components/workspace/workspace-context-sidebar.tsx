'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChatContext } from 'stream-chat-react';
import { useAuth } from '@/lib/auth';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { usePresence } from '@/hooks/use-live-presence';
import { useWorkspaceListData } from '@/hooks/use-workspace-list-data';
import {
  fetchConversationSummaries,
  generateConversationSummary,
  type ConversationSummaryItem,
  type SummaryPeriodType,
} from '@/lib/api-client';
import {
  listProjectMembers,
  listDocuments,
  listMilestones,
  fetchAiSummary,
  type ProjectMember,
  type DocumentItem,
  type MilestoneItem,
  type AiSummary,
} from '@/lib/projects-api';
import { PresenceIndicator } from '@/components/presence/presence-indicator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupSettingsContent } from '@/components/chat/group-settings-drawer';
import { IconBookmark, IconClock, IconMessageCircle, IconNote, IconPin, IconSettings, IconSparkles, IconUsers } from '@/components/ui/icons';
import { useWorkspace } from './workspace-context';

export function WorkspaceContextSidebar() {
  const { mode, contextOpen, setContextOpen } = useWorkspace();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <h2 className="text-sm font-semibold text-slate-800">Details</h2>
        <button
          onClick={() => setContextOpen(false)}
          aria-label="Close details"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!mode && <EmptyHint />}
        {mode?.type === 'channel' && <ChannelDetails />}
        {mode?.type === 'project' && <ProjectDetails projectId={mode.projectId} />}
        {mode?.type === 'task' && <TaskDetails taskId={mode.taskId} />}
        {mode?.type === 'meeting' && <MeetingDetails meetingId={mode.meetingId} />}
        {mode?.type === 'starred' && <StarredDetails />}
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="text-xs text-slate-400">
      Select a conversation, project, task, meeting, or starred message to see
      its details here.
    </p>
  );
}

// --- Channel details ---

function ChannelDetails() {
  const { channel } = useChatContext();
  const { client } = useStreamChatContext();
  const { getToken } = useAuth();
  const { setContextOpen } = useWorkspace();
  const memberIds = useMemo(() => Object.keys(channel?.state?.members ?? {}), [channel]);
  const { presence } = usePresence(client, memberIds);

  const members = useMemo(() => {
    if (!channel) return [];
    const membersObj = channel.state.members ?? {};
    return Object.entries(membersObj).map(([id, member]) => ({
      id,
      name: member.user?.name || id,
      imageUrl: member.user?.image ?? null,
      online: presence.get(id)?.online ?? Boolean(member.user?.online),
      lastActive: presence.get(id)?.lastActive ?? member.user?.last_active ?? null,
    }));
  }, [channel, presence]);

  const attachments = useMemo(() => {
    const files: { name: string; type: string; url: string }[] = [];
    const seen = new Set<string>();
    const messages = channel?.state?.messages ?? [];
    for (const message of messages) {
      const atts = message.attachments ?? [];
      for (const att of atts) {
        if (!att.title && !att.fallback && !att.asset_url) continue;
        const key = att.title ?? att.asset_url ?? att.fallback ?? '';
        if (seen.has(key)) continue;
        seen.add(key);
        files.push({
          name: att.title ?? att.fallback ?? 'Attachment',
          type: att.type ?? 'file',
          url: att.asset_url ?? '',
        });
      }
    }
    return files;
  }, [channel]);

  const pinnedCount = channel?.state?.pinnedMessages?.length ?? 0;
  const activity = useMemo(() => {
    const messages = channel?.state?.messages ?? [];
    const byId = new Map<string, number>();
    for (const message of messages) {
      const senderId = message.user?.id;
      if (senderId) byId.set(senderId, (byId.get(senderId) ?? 0) + 1);
    }
    const entries = Object.entries(membersObjActivity(channel)).map(([id, name]) => ({
      id,
      name,
      count: byId.get(id) ?? 0,
    }));
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 5);
  }, [channel]);

  const channelData = channel?.data as
    | { channel_kind?: string; name?: string; description?: string }
    | undefined;
  const kind = channelData?.channel_kind ?? null;
  const isArchived = Boolean((channel?.data as { frozen?: boolean } | undefined)?.frozen);
  const isDm = Boolean(!channelData?.name && !channelData?.channel_kind && members.length <= 2);

  return (
    <div className="space-y-6">
      {channelData?.description && (
        <p className="text-xs leading-5 text-slate-500">{channelData.description}</p>
      )}
      {kind && (
        <div>
          <SectionTitle icon={<IconMessageCircle width={13} height={13} />} label="Type" />
          <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium capitalize text-slate-600">
            {kind.replace('_', ' ')}
          </p>
        </div>
      )}
      {isArchived && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Archived conversation — read only.
        </p>
      )}

      {!isDm && (
        <div>
          <SectionTitle icon={<IconUsers width={13} height={13} />} label={`Members (${members.length})`} />
          <ul className="mt-2 space-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-2.5">
                <Avatar name={member.name} imageUrl={member.imageUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">{member.name}</p>
                </div>
                <PresenceIndicator online={member.online} lastSeen={member.lastActive} variant="compact" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isDm && !isArchived && channelData?.name && (
        <div>
          <SectionTitle icon={<IconSettings width={13} height={13} />} label="Group settings" />
          <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/40 p-3">
            <GroupSettingsContent onClose={() => setContextOpen(false)} />
          </div>
        </div>
      )}

      <div>
        <SectionTitle icon={<IconPin width={13} height={13} />} label={`Pinned (${pinnedCount})`} />
        {pinnedCount === 0 ? (
          <p className="mt-1 text-xs text-slate-400">No pinned messages.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(channel?.state?.pinnedMessages ?? []).slice(0, 10).map((message) => (
              <li key={message.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="line-clamp-2 text-xs text-slate-600">
                  {message.user?.name ?? 'Unknown'}: {message.text ?? 'Attachment'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {attachments.length > 0 && (
        <div>
          <SectionTitle icon={<IconNote width={13} height={13} />} label="Shared files" />
          <ul className="mt-2 space-y-1.5">
            {attachments.slice(0, 10).map((file, idx) => (
              <li key={`${file.name}-${idx}`}>
                <a
                  href={file.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <IconNote width={14} height={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{file.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AiSummarySection channelId={channel?.id ?? ''} />

      {activity.length > 0 && (
        <div>
          <SectionTitle icon={<IconClock width={13} height={13} />} label="Recent activity" />
          <ul className="mt-2 space-y-1.5">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-600">{entry.name}</span>
                <span className="shrink-0 text-slate-400">{entry.count} messages</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function membersObjActivity(
  channel: { state?: { members?: Record<string, { user?: { name?: string; id?: string } }> } } | undefined | null,
): Record<string, string> {
  const result: Record<string, string> = {};
  const members = channel?.state?.members ?? {};
  for (const [id, member] of Object.entries(members)) {
    result[id] = member.user?.name || id;
  }
  return result;
}

// --- Project details ---

function ProjectDetails({ projectId }: { projectId: string }) {
  const { getToken } = useAuth();
  const { client } = useStreamChatContext();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const { presence } = usePresence(client, memberIds);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const [m, d, ms, s] = await Promise.all([
          listProjectMembers(token, projectId),
          listDocuments(token, projectId),
          listMilestones(token, projectId),
          fetchAiSummary(token, projectId).catch(() => null),
        ]);
        if (!cancelled) {
          setMembers(m);
          setDocuments(d);
          setMilestones(ms);
          setSummary(s);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, getToken]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={<IconUsers width={13} height={13} />} label={`Members (${members.length})`} />
        <ul className="mt-2 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2.5">
              <Avatar name={member.name ?? member.id} imageUrl={member.imageUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{member.name ?? member.id}</p>
                <p className="text-[10px] capitalize text-slate-400">{member.role}</p>
              </div>
              <PresenceIndicator
                online={presence.get(member.id)?.online ?? false}
                lastSeen={presence.get(member.id)?.lastActive ?? null}
                variant="compact"
              />
            </li>
          ))}
        </ul>
      </div>

      {documents.length > 0 && (
        <div>
          <SectionTitle icon={<IconNote width={13} height={13} />} label="Shared documents" />
          <ul className="mt-2 space-y-1.5">
            {documents.slice(0, 10).map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.fileUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <IconNote width={14} height={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{doc.originalName}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {milestones.length > 0 && (
        <div>
          <SectionTitle icon={<IconClock width={13} height={13} />} label="Milestones" />
          <ul className="mt-2 space-y-2">
            {milestones.slice(0, 10).map((milestone) => (
              <li key={milestone.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-slate-700">{milestone.title}</p>
                  <span className="shrink-0 text-[10px] uppercase text-slate-400">{milestone.status.replace('_', ' ')}</span>
                </div>
                {milestone.dueDate && (
                  <p className="mt-0.5 text-[11px] text-slate-400">Due {new Date(milestone.dueDate).toLocaleDateString()}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div>
          <SectionTitle icon={<IconSparkles width={13} height={13} />} label="AI Summary" />
          <div className="mt-2 space-y-2">
            <p className="text-xs leading-5 text-slate-600">{summary.overview}</p>
            {summary.actionItems.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs text-slate-500">
                {summary.actionItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Task details ---

function TaskDetails({ taskId }: { taskId: string }) {
  const { tasks, isLoading } = useWorkspaceListData();
  const { setMode } = useWorkspace();
  const task = tasks.find((t) => t.id === taskId);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (!task) return <p className="text-xs text-slate-400">Task not found.</p>;

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle label="Task" />
        <p className="mt-1 text-sm font-medium text-slate-800">{task.title}</p>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Status</dt>
          <dd className="text-slate-700">{task.status}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Priority</dt>
          <dd className="text-slate-700">{task.priority}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Due</dt>
          <dd className="text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</dd>
        </div>
      </dl>
      <Button variant="outline" size="sm" onClick={() => setMode(null)}>
        Close task
      </Button>
    </div>
  );
}

// --- Meeting details ---

function MeetingDetails({ meetingId }: { meetingId: string }) {
  const { meetings, isLoading } = useWorkspaceListData();
  const meeting = meetings.find((m) => m.id === meetingId);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (!meeting) return <p className="text-xs text-slate-400">Meeting not found.</p>;

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle label="Meeting" />
        <p className="mt-1 text-sm font-medium text-slate-800">{meeting.title}</p>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Status</dt>
          <dd className="text-slate-700">{meeting.meetingStatus}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Date</dt>
          <dd className="text-slate-700">{new Date(meeting.scheduledDate).toLocaleDateString()}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Time</dt>
          <dd className="text-slate-700">{meeting.startTime} – {meeting.endTime}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-400">Participants</dt>
          <dd className="text-slate-700">{meeting.participants.length}</dd>
        </div>
      </dl>
    </div>
  );
}

// --- Starred details ---

function StarredDetails() {
  const { bookmarks, isLoading } = useWorkspaceListData();

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <IconBookmark width={20} height={20} className="text-slate-300" />
        <p className="text-xs text-slate-400">No starred messages yet.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle icon={<IconBookmark width={13} height={13} />} label={`Starred (${bookmarks.length})`} />
      <ul className="mt-2 space-y-2">
        {bookmarks.slice(0, 10).map((bookmark) => (
          <li key={bookmark.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="line-clamp-2 text-xs text-slate-600">
              {bookmark.sourceMessageText ?? 'Saved message'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {bookmark.sourceChannelName ?? 'Unknown channel'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Shared bits ---

function SectionTitle({ icon, label }: { icon?: React.ReactNode; label: string }) {
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
          data = await generateConversationSummary(token, { channelId, periodType: 'daily' });
        } else if (periodType === 'weekly') {
          data = await generateConversationSummary(token, { channelId, periodType: 'weekly' });
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
    void load();
  }, [channelId, load]);

  return (
    <div>
      <SectionTitle icon={<IconSparkles width={13} height={13} />} label="AI Summary" />
      {isLoading ? (
        <Skeleton className="mt-2 h-24 w-full rounded-lg" />
      ) : error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : summary ? (
        <div className="mt-2 space-y-2">
          <p className="line-clamp-4 text-xs leading-5 text-slate-600">{summary.overview}</p>
          {summary.actionItems.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Action items</p>
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
