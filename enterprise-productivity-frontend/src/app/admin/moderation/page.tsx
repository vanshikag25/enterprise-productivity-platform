'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import {
  fetchModerationLogs,
  fetchModerationReports,
  updateModerationReport,
  hasMinRole,
  type ModerationActionType,
  type ModerationLogItem,
  type ModerationReportItem,
  type ModerationReportStatus,
} from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { IconAlertTriangle, IconLock, IconShield, IconTrash } from '@/components/ui/icons';

const PAGE_SIZE = 25;

const STATUS_FILTERS: { value: ModerationReportStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const STATUS_VARIANT: Record<ModerationReportStatus, BadgeVariant> = {
  pending: 'amber',
  reviewing: 'blue',
  resolved: 'green',
  dismissed: 'gray',
};

const ACTION_LABELS: Record<ModerationActionType, string> = {
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

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Tab = 'reports' | 'logs';

export default function AdminModerationPage() {
  const { getToken } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('reports');

  // Reports state
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPages, setReportsPages] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ModerationReportStatus | ''>('');
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<ModerationLogItem[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPages, setLogsPages] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<ModerationActionType | ''>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function token(): Promise<string> {
    const t = await getToken();
    if (!t) throw new Error('Unable to retrieve session token.');
    return t;
  }

  async function loadReports(page: number, status: ModerationReportStatus | '') {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchModerationReports(await token(), {
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
      });
      setReports(res.items);
      setReportsTotal(res.total);
      setReportsPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLogs(page: number, actionType: ModerationActionType | '') {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchModerationLogs(await token(), {
        page,
        limit: PAGE_SIZE,
        actionType: actionType || undefined,
      });
      setLogs(res.items);
      setLogsTotal(res.total);
      setLogsPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports(1, '');
    }, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'reports') {
        loadReports(reportsPage, statusFilter);
      } else {
        loadLogs(logsPage, actionFilter);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReportAction(report: ModerationReportItem, action: 'review' | 'resolve' | 'dismiss') {
    const note =
      action === 'dismiss' || action === 'resolve'
        ? window.prompt(`Optional note for "${action}" (leave blank for none):`) ?? undefined
        : undefined;
    setBusyReportId(report.id);
    try {
      await updateModerationReport(await token(), report.id, { action, note });
      showToast(`Report ${action} — ${ACTION_LABELS[`report_${action}` as ModerationActionType]}.`);
      loadReports(reportsPage, statusFilter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update report.', 'error');
    } finally {
      setBusyReportId(null);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  if (roleLoading) {
    return (
      <div className="page-container">
        <div className="space-y-3">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!role || !hasMinRole(role, 'team_lead')) {
    return (
      <div className="page-container flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm">
          <IconLock width={24} height={24} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Access denied</p>
        <p className="text-sm text-slate-500">Only Team Leads and above can review reports and moderation logs.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Chat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Moderation"
        subtitle="Review reported content, take action, and audit the moderation trail."
        icon={<IconShield width={20} height={20} />}
        actions={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchTab('reports')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Reports
            </button>
            <button
              type="button"
              onClick={() => switchTab('logs')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Logs
            </button>
          </div>
        }
      />

      {tab === 'reports' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  setReportsPage(1);
                  loadReports(1, filter.value);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400">
              {reportsTotal} report{reportsTotal === 1 ? '' : 's'}
            </span>
          </div>

          {isLoading && (
            <div className="space-y-3">
              <div className="h-28 w-full animate-pulse rounded-xl bg-slate-200" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-slate-200" />
            </div>
          )}
          {!isLoading && error && <ErrorState message={error} onRetry={() => loadReports(reportsPage, statusFilter)} />}
          {!isLoading && !error && reports.length === 0 && (
            <EmptyState
              title="No reports"
              description="Reported messages and users will appear here for review."
            />
          )}

          {!isLoading && !error && reports.length > 0 && (
            <>
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={report.targetType === 'message' ? 'indigo' : 'cyan'}>
                        {report.targetType === 'message' ? 'Message' : 'User'}
                      </Badge>
                      <p className="min-w-0 flex-1 font-medium text-slate-800">
                        {report.targetType === 'message'
                          ? report.targetMessageText
                            ? report.targetMessageText
                            : `Message ${report.targetMessageId ?? ''}`
                          : report.targetUserName ?? report.targetUserId ?? 'Unknown user'}
                      </p>
                      <Badge variant={STATUS_VARIANT[report.status]}>{report.status}</Badge>
                    </div>

                    {report.targetMessageText && report.targetType === 'user' && (
                      <p className="mt-1 text-xs text-slate-500">{report.targetMessageText}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <IconAlertTriangle width={13} height={13} className="text-amber-500" />
                        {report.reason}
                      </span>
                      {report.channelName && <span>in {report.channelName}</span>}
                      <span>reported by {report.reporterName}</span>
                      <span>{formatDateTime(report.createdAt)}</span>
                    </div>

                    {report.description && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{report.description}</p>
                    )}
                    {report.resolutionNote && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        <span className="font-medium">Note:</span> {report.resolutionNote}
                      </p>
                    )}

                    {report.status !== 'resolved' && report.status !== 'dismissed' ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyReportId === report.id}
                          onClick={() => handleReportAction(report, 'review')}
                        >
                          Review
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          disabled={busyReportId === report.id}
                          onClick={() => handleReportAction(report, 'resolve')}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyReportId === report.id}
                          onClick={() => handleReportAction(report, 'dismiss')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                        {report.reviewedBy && <span>Handled by {report.reviewedBy}</span>}
                        {report.reviewedAt && <span>{formatDateTime(report.reviewedAt)}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {reportsPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reportsPage === 1}
                    onClick={() => {
                      const next = reportsPage - 1;
                      setReportsPage(next);
                      loadReports(next, statusFilter);
                    }}
                  >
                    Prev
                  </Button>
                  <span className="text-slate-500">
                    Page {reportsPage} of {reportsPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reportsPage === reportsPages}
                    onClick={() => {
                      const next = reportsPage + 1;
                      setReportsPage(next);
                      loadReports(next, statusFilter);
                    }}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select
              value={actionFilter}
              onChange={(e) => {
                const value = e.target.value as ModerationActionType | '';
                setActionFilter(value);
                setLogsPage(1);
                loadLogs(1, value);
              }}
              className="w-auto"
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <span className="ml-auto text-xs text-slate-400">
              {logsTotal} log{logsTotal === 1 ? '' : 's'}
            </span>
          </div>

          {isLoading && <div className="h-64 w-full animate-pulse rounded-xl bg-slate-200" />}
          {!isLoading && error && <ErrorState message={error} onRetry={() => loadLogs(logsPage, actionFilter)} />}
          {!isLoading && !error && logs.length === 0 && (
            <EmptyState
              title="No logs"
              description="Moderation actions will be recorded here."
            />
          )}

          {!isLoading && !error && logs.length > 0 && (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="data-list">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        {log.actionType.startsWith('user_ban') ? (
                          <IconShield width={15} height={15} />
                        ) : log.actionType.startsWith('message_delete') ||
                          log.actionType.startsWith('member_remove') ? (
                          <IconTrash width={15} height={15} />
                        ) : (
                          <IconAlertTriangle width={15} height={15} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-800">{ACTION_LABELS[log.actionType]}</p>
                          <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          by {log.moderatorName} ({log.moderatorRole})
                          {log.targetUserId ? ` · ${log.targetUserId}` : ''}
                          {log.channelId ? ` · channel ${log.channelId}` : ''}
                          {log.reason ? ` · "${log.reason}"` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {logsPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPage === 1}
                    onClick={() => {
                      const next = logsPage - 1;
                      setLogsPage(next);
                      loadLogs(next, actionFilter);
                    }}
                  >
                    Prev
                  </Button>
                  <span className="text-slate-500">
                    Page {logsPage} of {logsPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPage === logsPages}
                    onClick={() => {
                      const next = logsPage + 1;
                      setLogsPage(next);
                      loadLogs(next, actionFilter);
                    }}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}