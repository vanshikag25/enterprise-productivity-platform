'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  fetchUsersDirectory,
  updateUserRole,
  hasMinRole,
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_ROLE_RANK,
  type UserDirectoryItem,
  type UserRole,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { useToast } from '@/hooks/use-toast';
import { UserListSkeleton } from '@/components/directory/user-list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { IconLock, IconShield } from '@/components/ui/icons';

const PAGE_SIZE = 50;

const ROLE_VARIANT: Record<UserRole, 'red' | 'violet' | 'amber' | 'blue' | 'cyan' | 'green' | 'gray'> = {
  super_admin: 'red',
  organization_owner: 'violet',
  admin: 'amber',
  manager: 'blue',
  team_lead: 'cyan',
  employee: 'green',
  guest: 'gray',
};

export default function AdminRolesPage() {
  const { getToken, userId } = useAuth();
  const { role: myRole, me, isLoading: roleLoading, refresh } = useRole();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyClerkId, setBusyClerkId] = useState<string | null>(null);

  const myRank = myRole ? USER_ROLE_RANK[myRole] : 0;

  const assignableRoles: UserRole[] = useMemo(() => {
    if (!myRole) return [];
    if (myRole === 'super_admin') return [...USER_ROLES];
    return USER_ROLES.filter((r) => r !== 'super_admin' && r !== 'organization_owner' && USER_ROLE_RANK[r] < myRank);
  }, [myRole, myRank]);

  function canChangeRole(target: UserDirectoryItem): boolean {
    if (!myRole) return false;
    if (myRole === 'super_admin') return true;
    if (target.role === 'super_admin' || target.role === 'organization_owner') return false;
    return myRank > USER_ROLE_RANK[target.role];
  }

  async function load(opts?: { search?: string; page?: number }) {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const term = opts?.search ?? search;
      const pageNum = opts?.page ?? page;
      const res = await fetchUsersDirectory(token, {
        search: term.trim() || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
        sortBy: 'firstName',
        sortOrder: 'asc',
      });
      setUsers(res.users);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    load({ search: value, page: 1 });
  }

  const filtered = useMemo(
    () => (roleFilter ? users.filter((u) => u.role === roleFilter) : users),
    [users, roleFilter],
  );

  async function handleRoleChange(target: UserDirectoryItem, newRole: UserRole) {
    if (!window.confirm(`Change ${target.name}'s role to "${USER_ROLE_LABELS[newRole]}"?`)) return;
    setBusyClerkId(target.id);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await updateUserRole(token, target.id, newRole);
      showToast(`Role updated to ${USER_ROLE_LABELS[newRole]}.`);
      if (target.id === userId) refresh();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role.', 'error');
    } finally {
      setBusyClerkId(null);
    }
  }

  if (roleLoading) return <UserListSkeleton />;

  if (!myRole || !hasMinRole(myRole, 'admin')) {
    return (
      <div className="page-container flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm">
          <IconLock width={24} height={24} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Access denied</p>
        <p className="text-sm text-slate-500">Only Admins and above can manage roles.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Chat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Role Management"
        subtitle={`Signed in as ${me?.firstName ?? 'a user'} (${myRole ? USER_ROLE_LABELS[myRole] : ''}). You can assign ${myRole === 'super_admin' ? 'any role' : 'roles below your own'}.`}
        icon={<IconShield width={20} height={20} />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search users…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="min-w-[200px] flex-1 sm:max-w-xs"
        />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto">
          <option value="">All Roles</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
          ))}
        </Select>
      </div>

      {isLoading && <UserListSkeleton />}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && filtered.length === 0 && <EmptyState title="No users found" />}

      {!isLoading && !error && filtered.length > 0 && (
        <>
          <div className="data-list">
            {filtered.map((u) => {
              const editable = canChangeRole(u);
              return (
                <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={u.name} imageUrl={u.imageUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{u.name}</p>
                      <p className="truncate text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  {editable ? (
                    <Select
                      value={u.role}
                      disabled={busyClerkId === u.id}
                      onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                      className="w-auto text-xs"
                    >
                      <option value={u.role}>{USER_ROLE_LABELS[u.role]}</option>
                      {assignableRoles.filter((r) => r !== u.role).map((r) => (
                        <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
                      ))}
                    </Select>
                  ) : (
                    <Badge variant={ROLE_VARIANT[u.role]}>{USER_ROLE_LABELS[u.role]}</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-slate-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
