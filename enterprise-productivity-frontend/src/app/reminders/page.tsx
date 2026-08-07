'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  deleteReminder,
  fetchReminders,
  type ReminderItem,
  type ReminderPriority,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ReminderFormModal } from '@/components/reminders/reminder-form-modal';
import { IconClock, IconPlus, IconTrash, IconEdit, IconArrowRight } from '@/components/ui/icons';

const PRIORITY_VARIANT: Record<ReminderPriority, 'red' | 'amber' | 'blue'> = {
  High: 'red',
  Medium: 'amber',
  Low: 'blue',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeUntil(iso: string, triggered: boolean): string {
  if (triggered) return 'Triggered';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs < 0) {
    const overdueMin = Math.max(1, Math.floor(Math.abs(diffMs) / 60000));
    return overdueMin < 60 ? `Overdue by ${overdueMin}m` : `Overdue by ${Math.floor(overdueMin / 60)}h`;
  }
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 48) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

export default function RemindersPage() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderItem | null>(null);

  async function loadReminders() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setReminders(await fetchReminders(token, true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadReminders, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = reminders;
    if (statusFilter === 'pending') {
      result = result.filter((r) => !r.isTriggered);
    } else if (statusFilter === 'triggered') {
      result = result.filter((r) => r.isTriggered);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          (r.notes ?? '').toLowerCase().includes(term) ||
          (r.sourceChannelName ?? '').toLowerCase().includes(term),
      );
    }
    return [...result].sort((a, b) => {
      if (a.isTriggered !== b.isTriggered) return a.isTriggered ? 1 : -1;
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    });
  }, [reminders, search, statusFilter]);

  function openModal() {
    setEditing(null);
    setIsModalOpen(true);
  }

  function openEdit(reminder: ReminderItem) {
    setEditing(reminder);
    setIsModalOpen(true);
  }

  function openSource(reminder: ReminderItem) {
    if (!reminder.sourceChannelId || !reminder.sourceMessageId) return;
    router.push(
      `/dashboard?channel=${encodeURIComponent(reminder.sourceChannelId)}&message=${encodeURIComponent(reminder.sourceMessageId)}`,
    );
  }

  async function handleDelete(reminder: ReminderItem) {
    try {
      const token = await getToken();
      if (!token) return;
      await deleteReminder(token, reminder.id);
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
      showToast('Reminder deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete reminder.', 'error');
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Reminders"
        subtitle="Stay on top of time-sensitive tasks and messages."
        icon={<IconClock width={20} height={20} />}
        actions={
          <Button size="sm" onClick={openModal}>
            <span className="inline-flex items-center gap-1.5">
              <IconPlus width={14} height={14} />
              New reminder
            </span>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search reminders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="pending">Pending</option>
          <option value="triggered">Triggered</option>
          <option value="all">All</option>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={loadReminders} />}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<IconClock width={26} height={26} />}
          title={search || statusFilter !== 'pending' ? 'No reminders match' : 'No reminders yet'}
          description={
            search || statusFilter !== 'pending'
              ? 'Try adjusting your filters.'
              : 'Create a reminder to get notified at the right time.'
          }
          action={
            !search && statusFilter === 'pending' ? (
              <Button size="sm" onClick={openModal}>
                <span className="inline-flex items-center gap-1.5">
                  <IconPlus width={14} height={14} />
                  New reminder
                </span>
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="data-list">
          {filtered.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  reminder.isTriggered ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 text-orange-600'
                }`}
              >
                <IconClock width={16} height={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`truncate font-medium ${reminder.isTriggered ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {reminder.title}
                  </p>
                  <Badge variant={PRIORITY_VARIANT[reminder.priority]}>{reminder.priority}</Badge>
                  {reminder.isTriggered && <Badge variant="gray">Triggered</Badge>}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
                  <span className="font-medium text-slate-500">{formatDateTime(reminder.scheduledFor)}</span>
                  <span>·</span>
                  <span>{timeUntil(reminder.scheduledFor, reminder.isTriggered)}</span>
                  {reminder.sourceChannelName && (
                    <>
                      <span>·</span>
                      <span>{reminder.sourceChannelName}</span>
                    </>
                  )}
                </p>
                {reminder.notes && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">{reminder.notes}</p>
                )}
              </div>
              {!reminder.isTriggered && reminder.sourceChannelId && reminder.sourceMessageId && (
                <button
                  aria-label="Open source message"
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  onClick={() => openSource(reminder)}
                >
                  <span className="inline-flex items-center gap-1">
                    Open <IconArrowRight width={12} height={12} />
                  </span>
                </button>
              )}
              <button
                aria-label="Edit reminder"
                className="shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                onClick={() => openEdit(reminder)}
              >
                <IconEdit width={15} height={15} />
              </button>
              <button
                aria-label="Delete reminder"
                className="shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                onClick={() => void handleDelete(reminder)}
              >
                <IconTrash width={15} height={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ReminderFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadReminders}
          reminder={editing}
        />
      )}
    </div>
  );
}
