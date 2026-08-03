'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
  deleteProject,
  type ProjectItem,
  type ProjectMember,
  type ProjectMemberRole,
} from '@/lib/projects-api';
import { useUserSearch } from '@/hooks/use-user-search';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/initials';

const ROLE_LABEL: Record<ProjectMemberRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  member: 'Member',
  guest: 'Guest',
};

const ROLE_BADGE: Record<ProjectMemberRole, string> = {
  owner: 'bg-yellow-100 text-yellow-800',
  manager: 'bg-purple-100 text-purple-800',
  member: 'bg-blue-100 text-blue-700',
  guest: 'bg-gray-100 text-gray-600',
};

interface ProjectSettingsDrawerProps {
  project: ProjectItem;
  canDelete: boolean;
  onClose: () => void;
  onUpdated: (project: ProjectItem) => void;
  onDeleted: () => void;
}

export function ProjectSettingsDrawer({
  project,
  canDelete,
  onClose,
  onUpdated,
  onDeleted,
}: ProjectSettingsDrawerProps) {
  const { getToken, userId } = useAuth();
  const { showToast } = useToast();
  const { users, searchTerm, setSearchTerm, isLoading, error: searchError } =
    useUserSearch();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState(project.avatarUrl ?? '');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setMembers(await listProjectMembers(token, project.id));
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Failed to load members.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, [getToken, project.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleSave() {
    if (!name.trim()) {
      showToast('Project name is required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateProject(token, project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onUpdated(updated);
      setIsEditing(false);
      showToast('Project updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update project.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAvatar() {
    const url = avatarInput.trim();
    if (!url) {
      showToast('Enter an image URL.', 'error');
      return;
    }
    setIsSavingAvatar(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateProject(token, project.id, { avatarUrl: url });
      onUpdated(updated);
      setIsEditingAvatar(false);
      showToast('Project avatar updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update avatar.', 'error');
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setIsSavingAvatar(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateProject(token, project.id, { avatarUrl: '' });
      onUpdated(updated);
      setIsEditingAvatar(false);
      showToast('Project avatar removed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove avatar.', 'error');
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function refreshMembers() {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setMembers(await listProjectMembers(token, project.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to refresh members.', 'error');
    }
  }

  async function handleAddMember(memberId: string) {
    setBusyMemberId(memberId);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await addProjectMember(token, project.id, memberId);
      await refreshMembers();
      showToast('Member added.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add member.', 'error');
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRoleChange(member: ProjectMember, role: ProjectMemberRole) {
    setBusyMemberId(member.id);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await updateProjectMemberRole(token, project.id, member.id, role);
      await refreshMembers();
      showToast('Role updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role.', 'error');
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRemoveMember(member: ProjectMember) {
    if (!window.confirm(`Remove ${member.name ?? member.email ?? member.id} from the project?`)) {
      return;
    }
    setBusyMemberId(member.id);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await removeProjectMember(token, project.id, member.id);
      await refreshMembers();
      showToast('Member removed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove member.', 'error');
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await deleteProject(token, project.id);
      showToast('Project deleted.');
      onDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete project.', 'error');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const newMembers = users.filter((u) => !members.some((m) => m.id === u.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Project Settings</h2>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Close ×
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          {project.avatarUrl ? (
            <img
              src={project.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-medium">
              {getInitials(project.name)}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {!isEditingAvatar ? (
              <button
                onClick={() => {
                  setAvatarInput(project.avatarUrl ?? '');
                  setIsEditingAvatar(true);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                {project.avatarUrl ? 'Change avatar' : 'Set avatar'}
              </button>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Image URL"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  className="w-56 rounded border px-2 py-1 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAvatar}
                    disabled={isSavingAvatar}
                    className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSavingAvatar ? 'Saving…' : 'Save'}
                  </button>
                  {project.avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isSavingAvatar}
                      className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAvatarInput('');
                      setIsEditingAvatar(false);
                    }}
                    className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEditing ? (
          <div>
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="text-sm text-gray-500">
              {project.description || 'No description.'}
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Edit name & description
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <textarea
              placeholder="Project description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(project.name);
                  setDescription(project.description ?? '');
                }}
                className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <dl className="mt-4 space-y-1 text-sm">
          <div>
            <dt className="inline text-xs text-gray-400">Members: </dt>
            <dd className="inline">{members.length || project.memberCount}</dd>
          </div>
          <div>
            <dt className="inline text-xs text-gray-400">Your role: </dt>
            <dd className="inline font-medium">
              {project.currentUserRole
                ? ROLE_LABEL[project.currentUserRole]
                : 'Unknown'}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members</h3>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showAdd ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showAdd && (
            <div className="mb-2">
              <input
                placeholder="Search users…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-1 w-full rounded border px-2 py-1 text-sm"
              />
              {isLoading && <p className="p-1 text-xs text-gray-400">Loading…</p>}
              {searchError && <p className="p-1 text-xs text-red-500">{searchError}</p>}
              <ul className="max-h-32 overflow-y-auto rounded border">
                {newMembers.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => handleAddMember(u.id)}
                      disabled={busyMemberId === u.id}
                      className="flex w-full items-center justify-between px-2 py-1 text-left text-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span>{u.name}</span>
                      {busyMemberId === u.id && (
                        <span className="text-gray-400">Adding…</span>
                      )}
                    </button>
                  </li>
                ))}
                {!isLoading && newMembers.length === 0 && (
                  <li className="px-2 py-1 text-xs text-gray-400">
                    No new users to add.
                  </li>
                )}
              </ul>
            </div>
          )}

          {isLoadingMembers && (
            <p className="py-2 text-xs text-gray-400">Loading members…</p>
          )}
          {!isLoadingMembers && membersError && (
            <p className="py-2 text-xs text-red-500">{membersError}</p>
          )}

          {!isLoadingMembers && !membersError && (
            <ul className="divide-y">
              {members.map((member) => {
                const isOwner = member.role === 'owner';
                const isSelf = member.id === userId;
                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-2 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">
                        {member.name ?? member.email ?? member.id}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ROLE_BADGE[member.role]}`}
                      >
                        {ROLE_LABEL[member.role]}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      {!isOwner && !isSelf && (
                        <select
                          value={member.role}
                          disabled={busyMemberId === member.id}
                          onChange={(e) =>
                            handleRoleChange(member, e.target.value as ProjectMemberRole)
                          }
                          className="rounded border px-1 py-0.5 text-xs disabled:opacity-50"
                        >
                          {(['manager', 'member', 'guest'] as ProjectMemberRole[]).map(
                            (r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ),
                          )}
                        </select>
                      )}
                      {!isOwner && !isSelf && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={busyMemberId === member.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {canDelete && (
          <div className="mt-8 border-t pt-4">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`w-full rounded border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                confirmDelete
                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-500'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              {isDeleting
                ? 'Deleting…'
                : confirmDelete
                  ? 'Click again to confirm delete'
                  : 'Delete project'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
