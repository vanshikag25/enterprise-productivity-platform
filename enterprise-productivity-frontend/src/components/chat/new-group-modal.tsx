'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Channel as StreamChannel } from 'stream-chat';
import { createGroupChannel, type UserDirectoryItem } from '@/lib/api-client';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { GroupMemberPicker } from './group-member-picker';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelReady: (channel: StreamChannel) => void;
}

export function NewGroupModal({
  isOpen,
  onClose,
  onChannelReady,
}: NewGroupModalProps) {
  const { getToken } = useAuth();
  const { client } = useStreamChatContext();

  const [selectedUsers, setSelectedUsers] = useState<UserDirectoryItem[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setSelectedUsers([]);
    setGroupName('');
    setGroupDescription('');
    setError(null);
    onClose();
  }

  async function handleCreate() {
    if (!client) {
      setError('Chat client is not connected yet.');
      return;
    }

    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }

    if (selectedUsers.length === 0) {
      setError('Select at least one member.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Unable to retrieve Clerk session token.');
      }

      const { channelId } = await createGroupChannel(
        token,
        groupName.trim(),
        selectedUsers.map((u) => u.id),
        groupDescription.trim() || undefined,
      );

      if (!channelId) {
        throw new Error('Group was created without a channel id.');
      }

      const channel = client.channel('messaging', channelId);
      await channel.watch();

      onChannelReady(channel);
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="border-b border-slate-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">New Group</h2>
        <button
          onClick={resetAndClose}
          className="text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          Cancel
        </button>
      </div>

      <input
        type="text"
        placeholder="Group name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />

      <textarea
        placeholder="Group description (optional)"
        value={groupDescription}
        onChange={(e) => setGroupDescription(e.target.value)}
        rows={2}
        className="mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
      />

      <GroupMemberPicker
        selectedUsers={selectedUsers}
        onChange={setSelectedUsers}
      />

      {error && <p className="mb-2 mt-2 text-xs text-red-500">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={isSubmitting}
        className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {isSubmitting
          ? 'Creating…'
          : `Create Group (${selectedUsers.length} selected)`}
      </button>
    </div>
  );
}