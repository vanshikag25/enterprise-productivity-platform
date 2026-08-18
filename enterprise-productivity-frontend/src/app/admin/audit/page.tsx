'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/hooks/use-role';
import {
  AUDIT_ACTION_LABELS,
  fetchAuditLogs,
  hasMinRole,
  type AuditActionType,
  type AuditEventItem,
} from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { IconChevronDown, IconHistory, IconLock } from '@/components/ui/icons';

const PAGE_SIZE = 25;

const ACTION_VARIANT: Record<AuditActionType, BadgeVariant> = {
  message_edit: 'blue',
  message_delete: 'red',
  user_join: 'green',
  user_leave: 'amber',
  member_remove: 'red',
  role_change: 'indigo',
  channel_create: 'green',
  channel_delete: 'red',
  moderator_action: 'violet',
  user_mute: 'amber',
  user_unmute: 'blue',
  user_ban: 'red',
  user_unban: 'green',
  channel_lock: 'gray',
  channel_unlock: 'blue',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderValue(value: Record<string, unknown> | null): string {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminAuditPage() {
  const { getToken } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  const [items, setItems] = useState<AuditEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState<AuditActionType | ''>('');
  const [actorId, setActorId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function token(): Promise<string> {
    const t = await getToken();
    if (!t) throw new Error('Unable to retrieve session token.');
    return t;
  }

  async function load(
    p: number,
    filters: {
      search: string;
      actionType: AuditActionType | '';
      actorId: string;
      channelId: string;
      startDate: string;
      endDate: string;
      sort: 'newest' | 'oldest';
    },
  ) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs(await token(), {
        page: p,
        limit: PAGE_SIZE,
        search: filters.search || undefined,
        actionType: filters.actionType || undefined,
        actorId: filters.actorId || undefined,
        channelId: filters.channelId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        sort: filters.sort,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.totalPages);
      setPage(res.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(1, { search, actionType, actorId, channelId, startDate, endDate, sort });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, actionType, actorId, channelId, startDate, endDate, sort]);

  function clearFilters() {
    setSearch('');
    setActionType('');
    setActorId('');
    setChannelId('');
    setStartDate('');
    setEndDate('');
    setSort('newest');
  }

  const hasFilters =
    search !== '' ||
    actionType !== '' ||
    actorId !== '' ||
    channelId !== '' ||
    startDate !== '' ||
    endDate !== '' ||
    sort !== 'newest';

  if (roleLoading) {
    return (
      <div className="page-container">
        <div className="space-y-3">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!role || !hasMinRole(role, 'admin')) {
    return (
      <div className="page-container flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm">
          <IconLock width={24} height={24} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Access denied</p>
        <p className="text-sm text-slate-500">Only Super Admins and Admins can view audit logs.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Chat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable, append-only record of protected actions across the platform."
        icon={<IconHistory width={20} height={20} />}
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search actor, target, resource, channel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as AuditActionType | '')}
        >
          <option value="">All actions</option>
          {(Object.keys(AUDIT_ACTION_LABELS) as AuditActionType[]).map((value) => (
            <option key={value} value={value}>
              {AUDIT_ACTION_LABELS[value]}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Actor (username)"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
        />
        <Input
          placeholder="Channel ID"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-slate-500">
          From
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          To
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <Select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {total} event{total === 1 ? '' : 's'}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      )}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => load(page, { search, actionType, actorId, channelId, startDate, endDate, sort })} />
      )}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title="No audit events"
          description="Protected actions recorded here will appear in this log."
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="space-y-3">
            {items.map((event) => {
              const isExpanded = expandedId === event.id;
              return (
                <div key={event.id} className="rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                  >
                    <Badge variant={ACTION_VARIANT[event.actionType]}>
                      {AUDIT_ACTION_LABELS[event.actionType]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {event.actorName ?? event.actorId}
                        {event.targetUserId ? ` → ${event.targetUserName ?? event.targetUserId}` : ''}
                        {event.channelId ? ` · ${event.channelId}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(event.createdAt)} · {event.actorRole}
                        {event.reason ? ` · "${event.reason}"` : ''}
                      </p>
                    </div>
                    <IconChevronDown
                      width={16}
                      height={16}
                      className={`mt-1 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-3">
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-400">Event ID</dt>
                          <dd className="font-mono text-slate-600">{event.id}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Action</dt>
                          <dd className="text-slate-600">{AUDIT_ACTION_LABELS[event.actionType]}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Actor</dt>
                          <dd className="text-slate-600">
                            {event.actorName ?? '—'} ({event.actorId} · {event.actorRole})
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Target</dt>
                          <dd className="text-slate-600">
                            {event.targetUserName ? `${event.targetUserName} (${event.targetUserId})` : event.targetUserId ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Resource</dt>
                          <dd className="text-slate-600">
                            {event.resourceType}
                            {event.resourceName ? ` · ${event.resourceName}` : ''}
                            {event.resourceId ? ` (${event.resourceId})` : ''}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Channel / Project</dt>
                          <dd className="font-mono text-slate-600">
                            {event.channelId ?? event.projectId ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">IP address</dt>
                          <dd className="font-mono text-slate-600">{event.ipAddress ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Device</dt>
                          <dd className="truncate font-mono text-slate-600">{event.userAgent ?? '—'}</dd>
                        </div>
                        {event.reason && (
                          <div className="sm:col-span-2">
                            <dt className="text-slate-400">Reason</dt>
                            <dd className="text-slate-600">{event.reason}</dd>
                          </div>
                        )}
                        {(event.previousValue || event.newValue) && (
                          <div className="sm:col-span-2">
                            <dt className="text-slate-400">Change</dt>
                            <dd className="mt-1 flex flex-col gap-2 sm:flex-row">
                              {event.previousValue && (
                                <pre className="flex-1 overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600">
                                  {renderValue(event.previousValue)}
                                </pre>
                              )}
                              {event.newValue && (
                                <pre className="flex-1 overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600">
                                  {renderValue(event.newValue)}
                                </pre>
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => load(page - 1, { search, actionType, actorId, channelId, startDate, endDate, sort })}
              >
                Prev
              </Button>
              <span className="text-slate-500">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pages}
                onClick={() => load(page + 1, { search, actionType, actorId, channelId, startDate, endDate, sort })}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
