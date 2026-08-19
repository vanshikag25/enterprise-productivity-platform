'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useChatContext } from 'stream-chat-react';
import {
  fetchGroupInfo,
  updateGroupInfo,
  updateGroupAvatar,
  removeGroupAvatar,
  addGroupMember,
  removeGroupMember,
  assignGroupModerator,
  removeGroupModerator,
  leaveGroup,
  type GroupInfo,
} from '@/lib/api-client';
import { useUserSearch } from '@/hooks/use-user-search';
import { useToast } from '@/hooks/use-toast';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  moderator: 'Moderator',
  member: 'Member',
};

function getInitials(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface GroupSettingsDrawerProps {
  onClose: () => void;
}

export function GroupSettingsDrawer({ onClose }: GroupSettingsDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Group Settings</h2>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Close ×
          </button>
        </div>
        <GroupSettingsContent onClose={onClose} />
      </div>
    </div>
  );
}

export function GroupSettingsContent({ onClose }: { onClose: () => void }) {
  const { channel, setActiveChannel } = useChatContext();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { users, searchTerm, setSearchTerm, isLoading, error: searchError } =
    useUserSearch();

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const channelId = channel?.id ?? '';

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      setIsLoadingInfo(true);
      setLoadError(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const info = await fetchGroupInfo(token, channelId);
        if (isCancelled) return;
        setGroupInfo(info);
        setName(info.name ?? '');
        setDescription(info.description ?? '');
      } catch (err) {
        if (!isCancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load group info.',
          );
        }
      } finally {
        if (!isCancelled) setIsLoadingInfo(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [channelId, getToken]);

  async function handleSave() {
    if (!name.trim()) {
      showToast('Group name is required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await updateGroupInfo(token, channelId, {
        name: name.trim(),
        description: description.trim(),
      });
      setGroupInfo(updated);
      setIsEditing(false);
      showToast('Group updated.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update group.',
        'error',
      );
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
      const updated = await updateGroupAvatar(token, channelId, url);
      setGroupInfo(updated);
      setIsEditingAvatar(false);
      showToast('Group avatar updated.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update avatar.',
        'error',
      );
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setIsRemovingAvatar(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await removeGroupAvatar(token, channelId);
      setGroupInfo(updated);
      setIsEditingAvatar(false);
      showToast('Group avatar removed.');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to remove avatar.',
        'error',
      );
    } finally {
      setIsRemovingAvatar(false);
    }
  }

  async function runAction(
    action: (token: string) => Promise<GroupInfo>,
    successMessage: string,
  ) {
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const updated = await action(token);
      setGroupInfo(updated);
      showToast(successMessage);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Action failed.',
        'error',
      );
    }
  }

  async function handleAddMember(memberId: string) {
    setBusyMemberId(memberId);
    await runAction(
      (token) => addGroupMember(token, channelId, memberId),
      'Member added.',
    );
    setBusyMemberId(null);
  }

  async function handleRemoveMember(memberId: string) {
    setBusyMemberId(memberId);
    await runAction(
      (token) => removeGroupMember(token, channelId, memberId),
      'Member removed.',
    );
    setBusyMemberId(null);
  }

  async function handleAssignModerator(memberId: string) {
    setBusyMemberId(memberId);
    await runAction(
      (token) => assignGroupModerator(token, channelId, memberId),
      'Moderator assigned.',
    );
    setBusyMemberId(null);
  }

  async function handleRemoveModerator(memberId: string) {
    setBusyMemberId(memberId);
    await runAction(
      (token) => removeGroupModerator(token, channelId, memberId),
      'Moderator removed.',
    );
    setBusyMemberId(null);
  }

  async function handleLeaveGroup() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setIsLeaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      await leaveGroup(token, channelId);
      showToast('You left the group.');
      setActiveChannel(undefined);
      onClose();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to leave group.',
        'error',
      );
    } finally {
      setIsLeaving(false);
      setConfirmLeave(false);
    }
  }

  const canManage = groupInfo?.canManage ?? false;
  const canManageModerators = groupInfo?.canManageModerators ?? false;
  const currentUserId = channel?.state?.membership?.user_id ?? null;

  return (
    <>
      {isLoadingInfo && (
        <p className="py-4 text-sm text-gray-400">Loading…</p>
      )}

      {!isLoadingInfo && loadError && (
        <p className="py-4 text-sm text-red-500">{loadError}</p>
      )}

        {!isLoadingInfo && !loadError && groupInfo && (
          <>
            <div className="mb-4 flex items-center gap-3">
              {groupInfo.avatarUrl ? (
                <img
                  src={groupInfo.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-medium">
                  {getInitials(groupInfo.name)}
                </div>
              )}

              {canManage && (
                <div className="flex flex-col gap-1">
                  {!isEditingAvatar ? (
                    <button
                      onClick={() => {
                        setAvatarInput(groupInfo.avatarUrl ?? '');
                        setIsEditingAvatar(true);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {groupInfo.avatarUrl ? 'Change avatar' : 'Set avatar'}
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
                        {groupInfo.avatarUrl && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={isRemovingAvatar}
                            className="rounded border px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {isRemovingAvatar ? 'Removing…' : 'Remove'}
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
              )}
            </div>

            {!isEditing ? (
              <div>
                <h3 className="text-lg font-semibold">{groupInfo.name}</h3>
                <p className="text-sm text-gray-500">
                  {groupInfo.description || 'No description.'}
                </p>
                {canManage && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Edit name & description
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Group name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                <textarea
                  placeholder="Group description"
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
                      setName(groupInfo.name ?? '');
                      setDescription(groupInfo.description ?? '');
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
                <dd className="inline">{groupInfo.memberCount}</dd>
              </div>
              <div>
                <dt className="inline text-xs text-gray-400">Your role: </dt>
                <dd className="inline font-medium">
                  {groupInfo.currentUserRole === 'admin'
                    ? 'Admin'
                    : ROLE_LABEL[groupInfo.currentUserRole]}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Members</h3>
                {canManage && (
                  <button
                    onClick={() => setShowAdd((v) => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showAdd ? 'Cancel' : '+ Add'}
                  </button>
                )}
              </div>

              {showAdd && (
                <div className="mb-2">
                  <input
                    placeholder="Search users…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-1 w-full rounded border px-2 py-1 text-sm"
                  />
                  {isLoading && (
                    <p className="p-1 text-xs text-gray-400">Loading…</p>
                  )}
                  {searchError && (
                    <p className="p-1 text-xs text-red-500">{searchError}</p>
                  )}
                  <ul className="max-h-32 overflow-y-auto rounded border">
                    {users
                      .filter((u) => !groupInfo.members.some((m) => m.id === u.id))
                      .map((u) => (
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
                    {users.length > 0 &&
                      users.every((u) =>
                        groupInfo.members.some((m) => m.id === u.id),
                      ) && (
                        <li className="px-2 py-1 text-xs text-gray-400">
                          No new users to add.
                        </li>
                      )}
                  </ul>
                </div>
              )}

              <ul className="divide-y">
                {groupInfo.members.map((member) => {
                  const isSelf = member.id === currentUserId;
                  const isOwner = member.role === 'owner';
                  return (
                    <li
                      key={member.id}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{member.name || member.id}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            member.role === 'owner'
                              ? 'bg-yellow-100 text-yellow-800'
                              : member.role === 'moderator'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ROLE_LABEL[member.role]}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1">
                        {canManageModerators && !isOwner && !isSelf && (
                          member.role === 'moderator' ? (
                            <button
                              onClick={() => handleRemoveModerator(member.id)}
                              disabled={busyMemberId === member.id}
                              className="text-xs text-gray-500 hover:underline disabled:opacity-50"
                            >
                              Demote
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssignModerator(member.id)}
                              disabled={busyMemberId === member.id}
                              className="text-xs text-purple-600 hover:underline disabled:opacity-50"
                            >
                              Make Moderator
                            </button>
                          )
                        )}
                        {canManage && !isOwner && !isSelf && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
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
            </div>

            {groupInfo.currentUserRole !== 'owner' && (
              <div className="mt-8 border-t pt-4">
                <button
                  onClick={handleLeaveGroup}
                  disabled={isLeaving}
                  className={`w-full rounded border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    confirmLeave
                      ? 'border-red-600 bg-red-600 text-white hover:bg-red-500'
                      : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {isLeaving
                    ? 'Leaving…'
                    : confirmLeave
                      ? 'Click again to confirm leave'
                      : 'Leave group'}
                </button>
              </div>
            )}
          </>
        )}
    </>
  );
}
