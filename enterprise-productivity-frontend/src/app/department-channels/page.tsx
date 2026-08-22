'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  createDepartment,
  deleteDepartment,
  fetchMyDepartments,
  fetchUsersDirectory,
  hasMinRole,
  updateDepartment,
  USER_ROLE_LABELS,
  type DepartmentItem,
  type UserDirectoryItem,
} from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/form';
import { GroupMemberPicker } from '@/components/chat/group-member-picker';
import { IconDepartment, IconMessageCircle, IconPlus } from '@/components/ui/icons';

export default function DepartmentChannelsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { me, role, hasRole } = useRole();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<UserDirectoryItem[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMembers, setFormMembers] = useState<UserDirectoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreateDepartment = hasRole('admin');
  const canManageDepartment = hasRole('manager');

  async function loadDepartments() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const values = await fetchMyDepartments(token);
      setDepartments(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDirectoryUsers() {
    setIsDirectoryLoading(true);
    try {
      const token = await getToken();
      if (!token) return [];
      const response = await fetchUsersDirectory(token, { limit: 200 });
      setDirectoryUsers(response.users);
      return response.users;
    } catch {
      setDirectoryUsers([]);
      return [];
    } finally {
      setIsDirectoryLoading(false);
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, [getToken]);

  function resetForm() {
    setIsFormOpen(false);
    setEditingDepartment(null);
    setFormName('');
    setFormDescription('');
    setFormMembers([]);
    setFormError(null);
  }

  async function openCreateForm() {
    const users = await loadDirectoryUsers();
    setEditingDepartment(null);
    setFormName('');
    setFormDescription('');
    setFormMembers([]);
    setFormError(null);
    setDirectoryUsers(users);
    setIsFormOpen(true);
  }

  async function openEditForm(department: DepartmentItem) {
    const users = await loadDirectoryUsers();
    const selectedMembers = (users.length ? users : directoryUsers).filter((user) => department.memberIds.includes(user.id));
    setEditingDepartment(department);
    setFormName(department.name);
    setFormDescription(department.description ?? '');
    setFormMembers(selectedMembers);
    setFormError(null);
    setIsFormOpen(true);
  }

  async function submitForm() {
    if (!formName.trim()) {
      setFormError('Department name is required.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');

      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        memberIds: Array.from(new Set(formMembers.map((user) => user.id))),
      };

      if (editingDepartment) {
        await updateDepartment(token, editingDepartment.id, payload);
      } else {
        await createDepartment(token, payload);
      }

      await loadDepartments();
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save the department.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDepartment(id: string) {
    if (!window.confirm('Remove this department and its linked channel?')) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteDepartment(token, id);
      await loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the department.');
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Department Channels"
        subtitle="Departments with dedicated chat channels for team discussions."
        icon={<IconDepartment width={20} height={20} />}
        actions={
          canCreateDepartment && (
            <Button size="sm" onClick={openCreateForm}>
              <IconPlus width={15} height={15} />
              Create Department
            </Button>
          )
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex items-center justify-between p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={loadDepartments} />}
      {!isLoading && !error && departments.length === 0 && (
        <EmptyState
          icon={<IconDepartment width={26} height={26} />}
          title="No departments"
          description={
            canCreateDepartment
              ? 'Create a department to get started with a dedicated team channel.'
              : 'You are not assigned to any department yet.'
          }
          action={
            canCreateDepartment && (
              <Button size="sm" onClick={openCreateForm}>
                <IconPlus width={15} height={15} />
                Create Department
              </Button>
            )
          }
        />
      )}

      {!isLoading && !error && departments.length > 0 && (
        <div className="data-list">
          {departments.map((d) => (
            <div key={d.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{d.name}</p>
                {d.description && <p className="mt-0.5 truncate text-xs text-slate-400">{d.description}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{d.memberIds.length} member(s)</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {d.channelId ? (
                  <Button size="sm" onClick={() => router.push(`/dashboard?channel=${encodeURIComponent(d.channelId!)}`)}>
                    <IconMessageCircle width={15} height={15} />
                    Open Chat
                  </Button>
                ) : (
                  <Badge variant="gray">No channel yet</Badge>
                )}
                {canManageDepartment && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEditForm(d)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void handleDeleteDepartment(d.id)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={isFormOpen} onClose={resetForm} title={editingDepartment ? 'Edit Department' : 'Create Department'} maxWidth="lg">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Name</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Department name" autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Department purpose and responsibilities" />
          </div>
          <div>
            <Label>Members</Label>
            <GroupMemberPicker selectedUsers={formMembers} onChange={setFormMembers} />
          </div>
          {formError && <p className="field-error">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={() => void submitForm()} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingDepartment ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
