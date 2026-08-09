'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMeetings, type MeetingItem } from '@/lib/api-client';
import { useTaskDirectory } from '@/hooks/use-task-directory';
import { useRole } from '@/hooks/use-role';
import { CreateMeetingModal } from '@/components/meetings/create-meeting-modal';
import { MeetingDetailDrawer } from '@/components/meetings/meeting-detail-drawer';
import { MeetingListSkeleton } from '@/components/meetings/meeting-list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { IconCalendar, IconPlus } from '@/components/ui/icons';

const STATUSES = ['Scheduled', 'Ongoing', 'Completed', 'Cancelled'];

const STATUS_VARIANT: Record<string, 'blue' | 'amber' | 'green' | 'red'> = {
  Scheduled: 'blue',
  Ongoing: 'amber',
  Completed: 'green',
  Cancelled: 'red',
};

export default function MeetingsPage() {
  const { getToken, userId } = useAuth();
  const { users } = useTaskDirectory();
  const { can } = useRole();

  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<MeetingItem | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setMeetings(await fetchMeetings(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = meetings;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(term));
    }
    if (statusFilter) result = result.filter((m) => m.meetingStatus === statusFilter);
    return [...result].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [meetings, search, statusFilter]);

  return (
    <div className="page-container">
      <PageHeader
        title="Meetings"
        subtitle="Schedule and coordinate with your team."
        icon={<IconCalendar width={20} height={20} />}
        actions={
          can('create_meeting') && (
            <CreateMeetingModal onCreated={(m) => setMeetings((prev) => [m, ...prev])} />
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 sm:max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {isLoading && <MeetingListSkeleton />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<IconCalendar width={26} height={26} />}
          title="No meetings found"
          description={search || statusFilter ? 'Try adjusting your filters.' : 'Create a meeting to get started.'}
          action={can('create_meeting') && <CreateMeetingModal onCreated={(m) => setMeetings((prev) => [m, ...prev])} trigger={<Button size="sm"><IconPlus width={15} height={15} /> New meeting</Button>} />}
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="data-list">
          {filtered.map((m) => {
            const organizer = users.find((u) => u.id === m.organizerId);
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{m.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {new Date(m.scheduledDate).toLocaleDateString()} · {m.startTime}–{m.endTime} · {m.participants.length} participant(s)
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[m.meetingStatus] ?? 'gray'}>{m.meetingStatus}</Badge>
                <Avatar name={organizer?.name ?? 'Unknown'} imageUrl={organizer?.imageUrl} size="sm" />
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <MeetingDetailDrawer
          meeting={selected}
          currentUserId={userId}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setSelected(updated);
          }}
          onDeleted={(id) => setMeetings((prev) => prev.filter((m) => m.id !== id))}
        />
      )}
    </div>
  );
}
