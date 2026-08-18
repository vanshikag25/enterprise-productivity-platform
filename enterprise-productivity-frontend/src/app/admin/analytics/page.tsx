'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/hooks/use-role';
import { useAuth } from '@/lib/auth';
import { hasMinRole } from '@/lib/api-client';
import type {
  AnalyticsAiDetail,
  AnalyticsChannelsDetail,
  AnalyticsFilterOptions,
  AnalyticsMessagesDetail,
  AnalyticsModerationDetail,
  AnalyticsOverview,
  AnalyticsResponseTimeDetail,
  AnalyticsStorageDetail,
  AnalyticsTeamsDetail,
  AnalyticsUsersDetail,
} from '@/lib/api-client';
import {
  fetchAnalyticsAi,
  fetchAnalyticsChannels,
  fetchAnalyticsMessages,
  fetchAnalyticsModeration,
  fetchAnalyticsOverview,
  fetchAnalyticsResponseTime,
  fetchAnalyticsStorage,
  fetchAnalyticsTeams,
  fetchAnalyticsUsers,
} from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Avatar } from '@/components/ui/avatar';
import { Tabs } from '@/components/ui/tabs';
import {
  IconClock,
  IconInbox,
  IconLock,
  IconMessageCircle,
  IconProject,
  IconShield,
  IconSparkles,
  IconUsers,
} from '@/components/ui/icons';
import { KpiCard } from '@/components/analytics/kpi-card';
import { BarChart, LineChart } from '@/components/analytics/charts';
import { FilterBar } from '@/components/analytics/filter-bar';
import { DataTable, type DataTableColumn } from '@/components/analytics/data-table';
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatNumber,
  formatSeconds,
} from '@/components/analytics/format';

const PAGE_SIZE = 50;

type TabKey =
  | 'overview'
  | 'messages'
  | 'users'
  | 'channels'
  | 'teams'
  | 'storage'
  | 'ai'
  | 'moderation'
  | 'response-time';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'messages', label: 'Messages' },
  { key: 'users', label: 'Users' },
  { key: 'channels', label: 'Channels' },
  { key: 'teams', label: 'Teams' },
  { key: 'storage', label: 'Storage' },
  { key: 'ai', label: 'AI' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'response-time', label: 'Response Time' },
];

const INTENT_LABELS: Record<string, string> = {
  task: 'Task',
  meeting: 'Meeting',
  deadline: 'Deadline',
  reminder: 'Reminder',
  decision: 'Decision',
  follow_up: 'Follow-up',
};

const ACTION_LABELS: Record<string, string> = {
  message_delete: 'Message deleted',
  user_mute: 'User muted',
  user_unmute: 'User unmuted',
  member_remove: 'Member removed',
  user_ban: 'User banned',
  user_unban: 'User unbanned',
  channel_lock: 'Channel locked',
  channel_unlock: 'Channel unlocked',
  report_review: 'Report under review',
  report_resolve: 'Report resolved',
  report_dismiss: 'Report dismissed',
};

const FEATURE_LABELS: Record<string, string> = {
  summaries: 'Conversation summaries',
  translations: 'Message translations',
  action_detection: 'Action detection',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'amber',
  reviewing: 'blue',
  resolved: 'green',
  dismissed: 'gray',
};

function providerLabel(provider: string): string {
  return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Unknown';
}

function mimeLabel(mimeType: string): string {
  if (!mimeType) return 'Unknown';
  const short = mimeType.split('/').pop() ?? mimeType;
  return short.toUpperCase();
}

function KindBadge({ kind }: { kind: string }) {
  const variant: BadgeVariant =
    kind === 'project' ? 'blue' : kind === 'department' ? 'violet' : kind === 'group' ? 'cyan' : 'gray';
  return <Badge variant={variant}>{kind}</Badge>;
}

function ChangeNote({ changePct }: { changePct: number | null }) {
  if (changePct === null) return <span className="text-xs text-slate-400">—</span>;
  const positive = changePct >= 0;
  return (
    <span className={`text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {positive ? '↑' : '↓'} {Math.abs(changePct)}%
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function TruncatedBanner({ truncated }: { truncated: boolean }) {
  if (!truncated) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      Message volume exceeded the analysis limit for this period, so some figures are based on a
      partial sample.
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

// --- Detail views -----------------------------------------------------------

function MessagesView({ data }: { data: AnalyticsMessagesDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Messages per day">
        <LineChart
          data={data.daily.map((d) => ({ label: formatDate(d.date), value: d.messages }))}
          formatValue={formatNumber}
        />
      </ChartCard>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Top senders</h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {data.topSenders.length === 0 && <EmptyState title="No senders" description="No messages were found in this period." />}
            {data.topSenders.map((sender) => (
              <li key={sender.userId} className="flex items-center gap-3">
                <Avatar name={sender.name} imageUrl={sender.imageUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{sender.name}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  {formatNumber(sender.messageCount)} msgs
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Messages by channel</h3>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              { key: 'name', header: 'Channel', render: (row) => <span className="font-medium text-slate-800">{row.name}</span> },
              { key: 'kind', header: 'Kind', render: (row) => <KindBadge kind={row.kind} /> },
              { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.messageCount) },
              { key: 'users', header: 'Active users', render: (row) => formatNumber(row.activeUsers) },
            ]}
            rows={data.byChannel}
            emptyMessage="No messages in this period."
          />
        </CardBody>
      </Card>
    </div>
  );
}

function UsersView({ data }: { data: AnalyticsUsersDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-wrap gap-3">
        <StatPill label="Active users" value={formatNumber(data.totalActive)} />
        <StatPill label="Registered users" value={formatNumber(data.totalRegistered)} />
      </div>
      <ChartCard title="Active users per day">
        <LineChart
          data={data.daily.map((d) => ({ label: formatDate(d.date), value: d.activeUsers }))}
          formatValue={formatNumber}
        />
      </ChartCard>
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Active users</h3>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              {
                key: 'user',
                header: 'User',
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.name} imageUrl={row.imageUrl} size="sm" />
                    <span className="font-medium text-slate-800">{row.name}</span>
                  </div>
                ),
              },
              { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.messageCount) },
              {
                key: 'status',
                header: 'Status',
                render: (row) =>
                  row.online ? <Badge variant="green">Online</Badge> : <Badge variant="gray">Offline</Badge>,
              },
              { key: 'lastActive', header: 'Last active', render: (row) => formatDateTime(row.lastActive) },
            ]}
            rows={data.active}
            emptyMessage="No active users in this period."
          />
        </CardBody>
      </Card>
    </div>
  );
}

interface PaginatedTableProps<T> {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  total: number;
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}

function PaginatedTable<T>({ page, pages, onPrev, onNext, total, columns, rows, emptyMessage }: PaginatedTableProps<T>) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-800">Results</h3>
        <span className="text-xs text-slate-400">{total} total</span>
      </CardHeader>
      <CardBody>
        <DataTable columns={columns} rows={rows} emptyMessage={emptyMessage} />
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
              Prev
            </Button>
            <span className="text-slate-500">
              Page {page} of {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={onNext}>
              Next
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ChannelsView({ data, page, pages, onPrev, onNext }: {
  data: AnalyticsChannelsDetail;
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const columns: DataTableColumn<AnalyticsChannelsDetail['items'][number]>[] = [
    { key: 'name', header: 'Channel', render: (row) => <span className="font-medium text-slate-800">{row.name}</span> },
    { key: 'kind', header: 'Kind', render: (row) => <KindBadge kind={row.kind} /> },
    { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.messageCount) },
    { key: 'members', header: 'Members', render: (row) => formatNumber(row.memberCount) },
    { key: 'active', header: 'Active users', render: (row) => formatNumber(row.activeUsers) },
    { key: 'createdBy', header: 'Created by', render: (row) => row.createdBy || '—' },
    { key: 'last', header: 'Last message', render: (row) => formatDateTime(row.lastMessageAt) },
  ];
  return (
    <PaginatedTable
      columns={columns}
      rows={data.items}
      page={page}
      pages={pages}
      onPrev={onPrev}
      onNext={onNext}
      total={data.total}
      emptyMessage="No channels with activity in this period."
    />
  );
}

function TeamsView({ data, page, pages, onPrev, onNext }: {
  data: AnalyticsTeamsDetail;
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const columns: DataTableColumn<AnalyticsTeamsDetail['items'][number]>[] = [
    { key: 'name', header: 'Team', render: (row) => <span className="font-medium text-slate-800">{row.name}</span> },
    { key: 'kind', header: 'Kind', render: (row) => <KindBadge kind={row.kind} /> },
    { key: 'messages', header: 'Messages', render: (row) => formatNumber(row.messageCount) },
    { key: 'active', header: 'Active users', render: (row) => formatNumber(row.activeUsers) },
    { key: 'members', header: 'Members', render: (row) => formatNumber(row.memberCount) },
  ];
  return (
    <PaginatedTable
      columns={columns}
      rows={data.items}
      page={page}
      pages={pages}
      onPrev={onPrev}
      onNext={onNext}
      total={data.items.length}
      emptyMessage="No team activity in this period."
    />
  );
}

function StorageView({ data }: { data: AnalyticsStorageDetail }) {
  const projectColumns: DataTableColumn<AnalyticsStorageDetail['byProject'][number]>[] = [
    { key: 'name', header: 'Project', render: (row) => <span className="font-medium text-slate-800">{row.name}</span> },
    { key: 'bytes', header: 'Size', render: (row) => formatBytes(row.bytes) },
    { key: 'documents', header: 'Documents', render: (row) => formatNumber(row.documents) },
  ];
  const mimeColumns: DataTableColumn<AnalyticsStorageDetail['byMime'][number]>[] = [
    { key: 'mime', header: 'File type', render: (row) => <span className="font-medium text-slate-700">{mimeLabel(row.mimeType)}</span> },
    { key: 'bytes', header: 'Size', render: (row) => formatBytes(row.bytes) },
    { key: 'documents', header: 'Documents', render: (row) => formatNumber(row.documents) },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total storage" value={formatBytes(data.totalBytes)} />
        <StatPill label="Documents" value={formatNumber(data.totalDocuments)} />
      </div>
      <ChartCard title="Storage growth">
        <LineChart
          data={data.daily.map((d) => ({ label: formatDate(d.date), value: d.bytes }))}
          color="#8b5cf6"
          formatValue={formatBytes}
        />
      </ChartCard>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">By project</h3>
        </CardHeader>
        <CardBody>
          <DataTable columns={projectColumns} rows={data.byProject} emptyMessage="No documents in this period." />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">By file type</h3>
        </CardHeader>
        <CardBody>
          <DataTable columns={mimeColumns} rows={data.byMime} emptyMessage="No documents in this period." />
        </CardBody>
      </Card>
    </div>
  );
}

function AiView({ data }: { data: AnalyticsAiDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-wrap gap-3">
        <StatPill label="AI operations" value={formatNumber(data.total)} />
      </div>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">By feature</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {data.byFeature.map((feature) => (
              <div key={feature.feature} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">
                  {FEATURE_LABELS[feature.feature] ?? feature.feature}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{formatNumber(feature.count)}</span>
                  <ChangeNote changePct={feature.changePct} />
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      <ChartCard title="AI usage per day">
        <LineChart
          data={data.daily.map((d) => ({ label: formatDate(d.date), value: d.total }))}
          color="#10b981"
          formatValue={formatNumber}
        />
      </ChartCard>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Detected intents</h3>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              { key: 'intent', header: 'Intent', render: (row) => <span className="font-medium text-slate-700">{INTENT_LABELS[row.intentType] ?? row.intentType}</span> },
              { key: 'count', header: 'Count', render: (row) => formatNumber(row.count) },
            ]}
            rows={data.byIntent}
            emptyMessage="No intents detected in this period."
          />
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">By provider</h3>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              { key: 'provider', header: 'Provider', render: (row) => <span className="font-medium text-slate-700">{providerLabel(row.provider)}</span> },
              { key: 'count', header: 'Count', render: (row) => formatNumber(row.count) },
            ]}
            rows={data.byProvider}
            emptyMessage="No AI provider activity in this period."
          />
        </CardBody>
      </Card>
    </div>
  );
}

function ModerationView({ data }: { data: AnalyticsModerationDetail }) {
  const statusColumns: DataTableColumn<AnalyticsModerationDetail['reportsByStatus'][number]>[] = [
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_VARIANTS[row.status] ?? 'gray'}>{row.status}</Badge> },
    { key: 'count', header: 'Reports', render: (row) => formatNumber(row.count) },
  ];
  const actionColumns: DataTableColumn<AnalyticsModerationDetail['actionsByType'][number]>[] = [
    { key: 'action', header: 'Action', render: (row) => <span className="font-medium text-slate-700">{ACTION_LABELS[row.actionType] ?? row.actionType}</span> },
    { key: 'count', header: 'Count', render: (row) => formatNumber(row.count) },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-wrap gap-3">
        <StatPill label="Pending reports" value={formatNumber(data.pendingReports)} />
        <StatPill label="Actions taken" value={formatNumber(data.totalActions)} />
      </div>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Reports by status</h3>
        </CardHeader>
        <CardBody>
          <DataTable columns={statusColumns} rows={data.reportsByStatus} emptyMessage="No reports in this period." />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Actions by type</h3>
        </CardHeader>
        <CardBody>
          <DataTable columns={actionColumns} rows={data.actionsByType} emptyMessage="No actions in this period." />
        </CardBody>
      </Card>
      <ChartCard title="Moderation activity per day">
        <LineChart
          data={data.daily.map((d) => ({ label: formatDate(d.date), value: d.actions }))}
          color="#f59e0b"
          formatValue={formatNumber}
        />
      </ChartCard>
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">Recent actions</h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {data.recentActions.length === 0 && <EmptyState title="No recent actions" description="Moderation actions will appear here." />}
            {data.recentActions.map((action) => (
              <li key={action.id} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <IconShield width={15} height={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-800">{ACTION_LABELS[action.actionType] ?? action.actionType}</p>
                    <span className="text-xs text-slate-400">{formatDateTime(action.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    by {action.moderatorName}
                    {action.targetUserId ? ` · ${action.targetUserId}` : ''}
                    {action.channelId ? ` · channel ${action.channelId}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function ResponseTimeView({ data }: { data: AnalyticsResponseTimeDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-wrap gap-3">
        <StatPill label="Average response time" value={formatSeconds(data.averageSeconds)} />
        <StatPill label="Samples" value={formatNumber(data.samples)} />
      </div>
      <Card className="lg:col-span-2">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800">By channel</h3>
        </CardHeader>
        <CardBody>
          <DataTable
            columns={[
              { key: 'name', header: 'Channel', render: (row) => <span className="font-medium text-slate-800">{row.name}</span> },
              { key: 'avg', header: 'Avg response time', render: (row) => formatSeconds(row.averageSeconds) },
              { key: 'samples', header: 'Samples', render: (row) => formatNumber(row.samples) },
            ]}
            rows={data.byChannel}
            emptyMessage="Not enough message exchanges to compute response times."
          />
        </CardBody>
      </Card>
    </div>
  );
}

// --- Page -------------------------------------------------------------------

type DetailData =
  | { kind: 'none' }
  | { kind: 'messages'; data: AnalyticsMessagesDetail }
  | { kind: 'users'; data: AnalyticsUsersDetail }
  | { kind: 'channels'; data: AnalyticsChannelsDetail }
  | { kind: 'teams'; data: AnalyticsTeamsDetail }
  | { kind: 'storage'; data: AnalyticsStorageDetail }
  | { kind: 'ai'; data: AnalyticsAiDetail }
  | { kind: 'moderation'; data: AnalyticsModerationDetail }
  | { kind: 'response-time'; data: AnalyticsResponseTimeDetail };

export default function AdminAnalyticsPage() {
  const { getToken } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [filters, setFilters] = useState({
    range: '30',
    teamId: '',
    departmentId: '',
    channelId: '',
  });
  const [page, setPage] = useState(1);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [detail, setDetail] = useState<DetailData>({ kind: 'none' });
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function token(): Promise<string> {
    const t = await getToken();
    if (!t) throw new Error('Unable to retrieve session token.');
    return t;
  }

  async function loadOverview() {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await fetchAnalyticsOverview(await token(), filters);
      setOverview(data);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadDetail(kind: Exclude<TabKey, 'overview'>) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const t = await token();
      const params = { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      switch (kind) {
        case 'messages':
          setDetail({ kind, data: await fetchAnalyticsMessages(t, params) });
          break;
        case 'users':
          setDetail({ kind, data: await fetchAnalyticsUsers(t, params) });
          break;
        case 'channels':
          setDetail({ kind, data: await fetchAnalyticsChannels(t, params) });
          break;
        case 'teams':
          setDetail({ kind, data: await fetchAnalyticsTeams(t, params) });
          break;
        case 'storage':
          setDetail({ kind, data: await fetchAnalyticsStorage(t, params) });
          break;
        case 'ai':
          setDetail({ kind, data: await fetchAnalyticsAi(t, params) });
          break;
        case 'moderation':
          setDetail({ kind, data: await fetchAnalyticsModeration(t, params) });
          break;
        case 'response-time':
          setDetail({ kind, data: await fetchAnalyticsResponseTime(t, params) });
          break;
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load analytics.');
      setDetail({ kind: 'none' });
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOverview();
    }, 0);
    return () => clearTimeout(timer);
  }, [filters.range, filters.teamId, filters.departmentId, filters.channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'overview') return;
    const timer = setTimeout(() => {
      loadDetail(activeTab);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, filters.range, filters.teamId, filters.departmentId, filters.channelId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(patch: Partial<typeof filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function refresh() {
    loadOverview();
    if (activeTab !== 'overview') loadDetail(activeTab);
  }

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setDetailError(null);
  }

  if (roleLoading) {
    return (
      <div className="page-container">
        <div className="space-y-3">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!role || !hasMinRole(role, 'manager')) {
    return (
      <div className="page-container flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm">
          <IconLock width={24} height={24} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Access denied</p>
        <p className="text-sm text-slate-500">Only Managers and above can view analytics.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Chat</Button>
        </Link>
      </div>
    );
  }

  const filterOptions: AnalyticsFilterOptions | null = overview?.filters ?? null;

  return (
    <div className="page-container">
      <PageHeader
        title="Analytics"
        subtitle="Monitor message activity, usage, and moderation across your workspace."
        icon={<IconSparkles width={20} height={20} />}
      />

      <div className="mb-4">
        <FilterBar
          range={filters.range}
          onRangeChange={(value) => updateFilter({ range: value })}
          teamId={filters.teamId}
          onTeamChange={(value) => updateFilter({ teamId: value })}
          departmentId={filters.departmentId}
          onDepartmentChange={(value) => updateFilter({ departmentId: value })}
          channelId={filters.channelId}
          onChannelChange={(value) => updateFilter({ channelId: value })}
          options={filterOptions}
          loading={overviewLoading || detailLoading}
          onRefresh={refresh}
        />
      </div>

      <div className="mb-4">
        <Tabs items={TABS} activeKey={activeTab} onChange={(key) => switchTab(key as TabKey)} />
      </div>

      {activeTab === 'overview' ? (
        <div>
          {overviewLoading && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          )}
          {!overviewLoading && overviewError && <ErrorState message={overviewError} onRetry={loadOverview} />}
          {!overviewLoading && !overviewError && !overview && (
            <EmptyState title="No analytics yet" description="Analytics will appear here once data is available." />
          )}
          {!overviewLoading && !overviewError && overview && (
            <>
              <TruncatedBanner truncated={overview.truncated} />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiCard label="Total messages" kpi={overview.kpis.totalMessages} format={formatNumber} icon={<IconMessageCircle width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="Active users" kpi={overview.kpis.activeUsers} format={formatNumber} icon={<IconUsers width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="Active channels" kpi={overview.kpis.activeChannels} format={formatNumber} icon={<IconInbox width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="Avg response time" kpi={overview.kpis.averageResponseTime} format={formatSeconds} icon={<IconClock width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="Storage used" kpi={overview.kpis.storageUsage} format={formatBytes} icon={<IconProject width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="AI operations" kpi={overview.kpis.aiUsage} format={formatNumber} icon={<IconSparkles width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="Pending reports" kpi={overview.kpis.pendingReports} format={formatNumber} icon={<IconShield width={16} height={16} className="text-slate-400" />} />
                <KpiCard label="Moderation actions" kpi={overview.kpis.moderationActivity} format={formatNumber} icon={<IconShield width={16} height={16} className="text-slate-400" />} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ChartCard title="Message activity">
                  <LineChart
                    data={overview.charts.messageActivity.map((d) => ({ label: formatDate(d.date), value: d.messages }))}
                    formatValue={formatNumber}
                  />
                </ChartCard>
                <ChartCard title="Most active teams">
                  <BarChart
                    data={overview.charts.teamActivity.map((team) => ({
                      key: team.channelId,
                      label: team.name,
                      sub: team.kind,
                      value: team.messageCount,
                    }))}
                    formatValue={formatNumber}
                  />
                </ChartCard>
                <ChartCard title="Storage usage">
                  <LineChart
                    data={overview.charts.storageUsage.map((d) => ({ label: formatDate(d.date), value: d.bytes }))}
                    color="#8b5cf6"
                    formatValue={formatBytes}
                  />
                </ChartCard>
                <ChartCard title="AI usage">
                  <LineChart
                    data={overview.charts.aiUsage.map((d) => ({ label: formatDate(d.date), value: d.total }))}
                    color="#10b981"
                    formatValue={formatNumber}
                  />
                </ChartCard>
                <ChartCard title="Moderation activity">
                  <LineChart
                    data={overview.charts.moderation.map((d) => ({ label: formatDate(d.date), value: d.actions }))}
                    color="#f59e0b"
                    formatValue={formatNumber}
                  />
                </ChartCard>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          {detailLoading && <div className="h-64 w-full animate-pulse rounded-xl bg-slate-200" />}
          {!detailLoading && detailError && <ErrorState message={detailError} onRetry={() => loadDetail(activeTab as Exclude<TabKey, 'overview'>)} />}
          {!detailLoading && !detailError && detail.kind === 'none' && (
            <EmptyState title="No data yet" description="Analytics will appear here once data is available." />
          )}
          {!detailLoading && !detailError && detail.kind !== 'none' && (
            <>
              {detail.kind === 'messages' && (
                <>
                  <TruncatedBanner truncated={detail.data.truncated} />
                  <div className="mb-4 flex flex-wrap gap-3">
                    <StatPill label="Messages" value={formatNumber(detail.data.total)} />
                  </div>
                  <MessagesView data={detail.data} />
                </>
              )}
              {detail.kind === 'users' && (
                <>
                  <TruncatedBanner truncated={detail.data.truncated} />
                  <UsersView data={detail.data} />
                </>
              )}
              {detail.kind === 'channels' && (
                <>
                  <TruncatedBanner truncated={detail.data.truncated} />
                  <ChannelsView
                    data={detail.data}
                    page={page}
                    pages={Math.max(1, Math.ceil(detail.data.total / PAGE_SIZE))}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => Math.min(Math.ceil(detail.data.total / PAGE_SIZE), p + 1))}
                  />
                </>
              )}
              {detail.kind === 'teams' && (
                <>
                  <TruncatedBanner truncated={detail.data.truncated} />
                  <TeamsView
                    data={detail.data}
                    page={page}
                    pages={Math.max(1, Math.ceil(detail.data.items.length / PAGE_SIZE))}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
              )}
              {detail.kind === 'storage' && <StorageView data={detail.data} />}
              {detail.kind === 'ai' && <AiView data={detail.data} />}
              {detail.kind === 'moderation' && <ModerationView data={detail.data} />}
              {detail.kind === 'response-time' && <ResponseTimeView data={detail.data} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
