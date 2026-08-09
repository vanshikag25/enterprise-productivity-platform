'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchTasks, type TaskItem } from '@/lib/api-client';
import { useTaskDirectory } from '@/hooks/use-task-directory';
import { useRole } from '@/hooks/use-role';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { TaskDetailDrawer } from '@/components/tasks/task-detail-drawer';
import { TaskListSkeleton } from '@/components/tasks/task-list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { IconPlus, IconTasks } from '@/components/ui/icons';

const STATUSES = ['Todo', 'In Progress', 'In Review', 'Completed', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const PAGE_SIZE = 10;

const STATUS_VARIANT: Record<string, 'gray' | 'blue' | 'amber' | 'green' | 'violet'> = {
  Todo: 'gray',
  'In Progress': 'blue',
  'In Review': 'amber',
  Completed: 'green',
  Closed: 'violet',
};

const PRIORITY_VARIANT: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'amber',
  Critical: 'red',
};

export default function TasksPage() {
  const { getToken, userId } = useAuth();
  const { users } = useTaskDirectory();
  const { can } = useRole();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt'>('createdAt');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TaskItem | null>(null);

  async function loadTasks() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setTasks(await fetchTasks(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadTasks, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = tasks;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(term));
    }
    if (statusFilter) result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter);

    result = [...result].sort((a, b) => {
      const aVal = sortBy === 'dueDate' ? a.dueDate : a.createdAt;
      const bVal = sortBy === 'dueDate' ? b.dueDate : b.createdAt;
      if (!aVal) return 1;
      if (!bVal) return -1;
      return new Date(bVal).getTime() - new Date(aVal).getTime();
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-container">
      <PageHeader
        title="Tasks"
        subtitle="Manage assignments, track progress, and close out work."
        icon={<IconTasks width={20} height={20} />}
        actions={
          can('create_task') && (
            <CreateTaskModal onCreated={(task) => setTasks((prev) => [task, ...prev])} />
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search title…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-auto">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="w-auto">
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'createdAt')} className="w-auto">
          <option value="createdAt">Sort by Created Date</option>
          <option value="dueDate">Sort by Due Date</option>
        </Select>
      </div>

      {isLoading && <TaskListSkeleton />}
      {!isLoading && error && <ErrorState message={error} onRetry={loadTasks} />}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<IconTasks width={26} height={26} />}
          title="No tasks found"
          description={search || statusFilter || priorityFilter ? 'Try adjusting your filters.' : 'Create a task to get started.'}
          action={can('create_task') && <CreateTaskModal onCreated={(task) => setTasks((prev) => [task, ...prev])} trigger={<Button size="sm"><IconPlus width={15} height={15} /> New task</Button>} />}
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <>
          <div className="data-list">
            {pageItems.map((task) => {
              const assignee = users.find((u) => u.id === task.assignee);
              return (
                <button
                  key={task.id}
                  onClick={() => setSelected(task)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{task.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}
                      {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge variant={PRIORITY_VARIANT[task.priority] ?? 'gray'}>{task.priority}</Badge>
                  <Badge variant={STATUS_VARIANT[task.status] ?? 'gray'}>{task.status}</Badge>
                  <Avatar name={assignee?.name ?? 'Unassigned'} imageUrl={assignee?.imageUrl} size="sm" />
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {selected && (
        <TaskDetailDrawer
          task={selected}
          currentUserId={userId}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setSelected(updated);
          }}
          onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </div>
  );
}
