'use client';

import { useUserSearch } from '@/hooks/use-user-search';
import type { UserDirectoryItem } from '@/lib/api-client';

interface GroupMemberPickerProps {
  selectedUsers: UserDirectoryItem[];
  onChange: (users: UserDirectoryItem[]) => void;
}

export function GroupMemberPicker({
  selectedUsers,
  onChange,
}: GroupMemberPickerProps) {
  const {
    users,
    searchTerm,
    setSearchTerm,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
  } = useUserSearch();

  const selectedIds = new Set(selectedUsers.map((u) => u.id));

  function toggle(user: UserDirectoryItem) {
    if (selectedIds.has(user.id)) {
      onChange(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      onChange([...selectedUsers, user]);
    }
  }

  function removeSelected(id: string) {
    onChange(selectedUsers.filter((u) => u.id !== id));
  }

  function selectAllLoaded() {
    const merged = [...selectedUsers];
    for (const user of users) {
      if (!selectedIds.has(user.id)) {
        merged.push(user);
      }
    }
    onChange(merged);
  }

  return (
    <div>
      {selectedUsers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
            >
              {user.name}
              <button
                type="button"
                onClick={() => removeSelected(user.id)}
                aria-label={`Remove ${user.name}`}
                className="font-bold hover:text-blue-950"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Search users…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={selectAllLoaded}
          className="shrink-0 rounded border px-2 py-1 text-xs transition-colors hover:bg-gray-50"
        >
          Select All
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto rounded border">
        {isLoading && <p className="p-2 text-xs text-gray-400">Loading users…</p>}

        {error && <p className="p-2 text-xs text-red-500">{error}</p>}

        {!isLoading && !error && users.length === 0 && (
          <p className="p-2 text-xs text-gray-400">No users found.</p>
        )}

        {!isLoading &&
          users.map((user) => (
            <label
              key={user.id}
              className="flex items-center gap-2 px-2 py-1 text-sm transition-colors hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(user.id)}
                onChange={() => toggle(user)}
              />
              <span>{user.name}</span>
            </label>
          ))}

        {hasMore && !isLoading && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full border-t px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}