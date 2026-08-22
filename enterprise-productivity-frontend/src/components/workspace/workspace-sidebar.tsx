'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChannelList, WithComponents, useChatContext } from 'stream-chat-react';
import type { Channel as StreamChannel } from 'stream-chat';
import { createCustomChannelListItem } from '@/components/chat/custom-channel-list-item';
import { NewGroupModal } from '@/components/chat/new-group-modal';
import { partitionChannels } from './channel-sections';
import { useWorkspace } from './workspace-context';
import { useWorkspaceListData } from '@/hooks/use-workspace-list-data';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import {
  IconBookmark,
  IconChevronDown,
  IconChevronsLeft,
  IconChevronsRight,
  IconDepartment,
  IconMegaphone,
  IconMessageCircle,
  IconPlus,
  IconProject,
  IconTasks,
  IconUsers,
} from '@/components/ui/icons';

const SECTION_ICONS = {
  dms: IconMessageCircle,
  teams: IconUsers,
  projects: IconProject,
  tasks: IconTasks,
  announcements: IconMegaphone,
  starred: IconBookmark,
  archived: IconMessageCircle,
};

const WORKSPACE_FILTERS = [
  'All',
  'Direct Messages',
  'Teams',
  'Departments',
  'Projects',
  'Starred Messages',
  'Tasks',
  'Announcements',
] as const;

type WorkspaceFilter = (typeof WORKSPACE_FILTERS)[number];

export function WorkspaceSidebar() {
  const { client, channel, setActiveChannel } = useChatContext();
  const userId = client?.userID ?? channel?.getClient()?.userID ?? '';
  const {
    mode,
    selectChannel,
    openProject,
    openTask,
    openStarred,
    sidebarCollapsed,
    setSidebarOpen,
    toggleSidebarCollapsed,
  } = useWorkspace();
  const { projects, tasks, departments, bookmarks, isLoading } = useWorkspaceListData();
  const router = useRouter();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [filter, setFilter] = useState<WorkspaceFilter>('All');

  const CustomChannelListItem = useMemo(
    () => createCustomChannelListItem(userId),
    [userId],
  );

  const handleChannelClick = useCallback(
    (channel: StreamChannel) => {
      if (channel.id) selectChannel(channel.id);
    },
    [selectChannel],
  );

  const renderChannels = useCallback(
    (channels: StreamChannel[], channelPreview: (channel: StreamChannel) => React.ReactNode) => {
      const groups = partitionChannels(channels);
      const shows = (section: WorkspaceFilter) => filter === 'All' || filter === section;
      return (
        <div className="flex flex-col">
          {shows('Direct Messages') && (
            <ChannelSection
              icon={<IconMessageCircle width={13} height={13} />}
              label="Direct Messages"
              channels={groups.dms}
              channelPreview={channelPreview}
              onChannelClick={handleChannelClick}
            />
          )}
          {shows('Teams') && (
            <ChannelSection
              icon={<IconUsers width={13} height={13} />}
              label="Teams"
              channels={groups.teams}
              channelPreview={channelPreview}
              onChannelClick={handleChannelClick}
            />
          )}
          {shows('Departments') && (
            <ApiSection
              icon={<IconDepartment width={13} height={13} />}
              label="Departments"
              items={departments.map((d) => ({
                id: d.id,
                title: d.name,
                subtitle: d.channelId ? 'Channel ready' : 'No channel',
                onOpen: () => {
                  if (d.channelId) router.push(`/dashboard?channel=${encodeURIComponent(d.channelId)}`);
                },
              }))}
            />
          )}
          {shows('Projects') && (
            <ApiSection
              icon={<IconProject width={13} height={13} />}
              label="Projects"
              items={projects.map((p) => ({
                id: p.id,
                title: p.name,
                subtitle: `${p.memberCount} members`,
                onOpen: () => openProject(p.id),
              }))}
              active={mode?.type === 'project'}
            />
          )}
          {shows('Tasks') && (
            <ApiSection
              icon={<IconTasks width={13} height={13} />}
              label="Tasks"
              items={tasks.map((t) => ({
                id: t.id,
                title: t.title,
                subtitle: t.status,
                onOpen: () => openTask(t.id),
              }))}
              active={mode?.type === 'task'}
            />
          )}
          {shows('Announcements') && (
            <ChannelSection
              icon={<IconMegaphone width={13} height={13} />}
              label="Announcements"
              channels={groups.announcements}
              channelPreview={channelPreview}
              onChannelClick={handleChannelClick}
            />
          )}
          {shows('Starred Messages') && (
            <ApiSection
              icon={<IconBookmark width={13} height={13} />}
              label="Starred"
              items={bookmarks.map((b) => ({
                id: b.id,
                title: b.sourceMessageText ?? 'Starred message',
                subtitle: b.sourceChannelName ?? 'Saved',
                onOpen: () => {
                  if (b.sourceChannelId) {
                    router.push(
                      `/dashboard?channel=${encodeURIComponent(b.sourceChannelId)}&message=${encodeURIComponent(b.sourceMessageId)}`,
                    );
                  } else {
                    openStarred();
                  }
                },
              }))}
              active={mode?.type === 'starred'}
              onViewAll={openStarred}
            />
          )}
          {filter === 'All' && (
            <ChannelSection
              icon={<IconMessageCircle width={13} height={13} />}
              label="Archived"
              channels={groups.archived}
              channelPreview={channelPreview}
              onChannelClick={handleChannelClick}
              archived
            />
          )}
        </div>
      );
    },
    [
      projects,
      tasks,
      departments,
      bookmarks,
      mode,
      handleChannelClick,
      openProject,
      openTask,
      openStarred,
      router,
      filter,
    ],
  );

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3">
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 md:hidden"
        >
          <IconChevronsRight width={16} height={16} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-sm font-semibold text-slate-800">Workspace</span>
            <WorkspaceFilterDropdown value={filter} onChange={setFilter} />
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewGroup(true)}
            aria-label="New group"
            title="New group"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <IconPlus width={16} height={16} />
          </button>
          <button
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {sidebarCollapsed ? (
              <IconChevronsRight width={16} height={16} />
            ) : (
              <IconChevronsLeft width={16} height={16} />
            )}
          </button>
        </div>
      </div>

      {showNewGroup && (
        <NewGroupModal
          isOpen={showNewGroup}
          onClose={() => setShowNewGroup(false)}
          onChannelReady={(newChannel) => {
            setActiveChannel(newChannel);
            if (newChannel.id) selectChannel(newChannel.id);
            setShowNewGroup(false);
          }}
        />
      )}

      <div className="min-h-0 flex-1">
        {sidebarCollapsed ? (
          <CollapsedRail
            onExpand={toggleSidebarCollapsed}
            onClick={toggleSidebarCollapsed}
            onNewGroup={() => {
              toggleSidebarCollapsed();
              setShowNewGroup(true);
            }}
            userId={userId}
          />
        ) : (
          <WithComponents overrides={{ ChannelListItemUI: CustomChannelListItem }}>
            <ChannelList
              filters={{ members: { $in: [userId] } }}
              sort={{ last_message_at: -1 }}
              setActiveChannelOnMount={false}
              channelRenderFilterFn={filterChannelForSections}
              renderChannels={renderChannels}
            />
          </WithComponents>
        )}
      </div>

      {isLoading && (
        <div className="absolute bottom-0 right-0 flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-400">
          <Spinner size={12} />
          Loading…
        </div>
      )}
    </div>
  );
}

function filterChannelForSections(channels: StreamChannel[]): StreamChannel[] {
  const excluded = new Set(['task', 'project', 'milestone']);
  return channels.filter((channel) => {
    const kind = (channel.data as { channel_kind?: string } | undefined)?.channel_kind;
    if (kind && excluded.has(kind)) return false;
    const name = (channel.data as { name?: string } | undefined)?.name;
    if (name?.startsWith('Meeting: ')) return false;
    return true;
  });
}

function ChannelSection({
  label,
  icon,
  channels,
  channelPreview,
  onChannelClick,
  archived,
}: {
  label: string;
  icon: React.ReactNode;
  channels: StreamChannel[];
  channelPreview: (channel: StreamChannel) => React.ReactNode;
  onChannelClick: (channel: StreamChannel) => void;
  archived?: boolean;
}) {
  if (channels.length === 0) return null;
  return (
    <div className="border-b border-slate-100">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2.5">
        <span className="text-slate-400">{icon}</span>
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <div className={archived ? 'opacity-70' : undefined}>
        {channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onChannelClick(channel)}
            className="cursor-pointer"
          >
            {channelPreview(channel)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiSection({
  label,
  icon,
  items,
  active,
  onViewAll,
}: {
  label: string;
  icon: React.ReactNode;
  items: { id: string; title: string; subtitle: string; onOpen: () => void }[];
  active?: boolean;
  onViewAll?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-slate-100">
      <div
        className="flex cursor-pointer items-center justify-between gap-1.5 px-3 pb-1 pt-2.5"
        onClick={onViewAll}
      >
        <div className="flex items-center gap-1.5">
          <span className={active ? 'text-blue-600' : 'text-slate-400'}>{icon}</span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          {items.length}
        </span>
      </div>
      <div className="pb-1">
        {items.slice(0, 8).map((item) => (
          <button
            key={item.id}
            onClick={item.onOpen}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-slate-50 ${
              active ? 'bg-blue-50/70' : ''
            }`}
          >
            <span className={`truncate text-sm ${active ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
              {item.title}
            </span>
            <span className="ml-auto shrink-0 truncate text-[11px] text-slate-400">
              {item.subtitle}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CollapsedRail({
  onExpand,
  onClick,
  onNewGroup,
  userId,
}: {
  onExpand: () => void;
  onClick: () => void;
  onNewGroup: () => void;
  userId: string;
}) {
  const sections = [
    { key: 'dms', icon: SECTION_ICONS.dms, label: 'Direct Messages' },
    { key: 'teams', icon: SECTION_ICONS.teams, label: 'Teams' },
    { key: 'projects', icon: SECTION_ICONS.projects, label: 'Projects' },
    { key: 'tasks', icon: SECTION_ICONS.tasks, label: 'Tasks' },
    { key: 'announcements', icon: SECTION_ICONS.announcements, label: 'Announcements' },
    { key: 'starred', icon: SECTION_ICONS.starred, label: 'Starred' },
    { key: 'archived', icon: SECTION_ICONS.archived, label: 'Archived' },
  ];

  return (
    <div className="flex h-full flex-col items-center gap-1 py-2">
      <Avatar name={userId} size="md" />
      <button
        onClick={onNewGroup}
        title="New group"
        aria-label="New group"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <IconPlus width={18} height={18} />
      </button>
      {sections.map((s) => (
        <button
          key={s.key}
          onClick={onExpand}
          title={s.label}
          aria-label={s.label}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <s.icon width={18} height={18} />
        </button>
      ))}
      <button
        onClick={onClick}
        title="Expand sidebar"
        aria-label="Expand sidebar"
        className="mt-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <IconChevronsRight width={18} height={18} />
      </button>
    </div>
  );
}

function WorkspaceFilterDropdown({
  value,
  onChange,
}: {
  value: WorkspaceFilter;
  onChange: (filter: WorkspaceFilter) => void;
}) {
  return (
    <label className="relative inline-flex min-w-0 flex-1 items-center">
      <span className="sr-only">Filter workspace</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as WorkspaceFilter)}
        className="w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        {WORKSPACE_FILTERS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <IconChevronDown
        width={12}
        height={12}
        className="pointer-events-none absolute right-1.5 text-slate-400"
      />
    </label>
  );
}