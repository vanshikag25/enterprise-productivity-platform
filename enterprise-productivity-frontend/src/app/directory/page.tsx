'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useUserSearch } from '@/hooks/use-user-search';
import { usePresence } from '@/hooks/use-live-presence';
import { useStreamChatContext } from '@/context/stream-chat-context';
import { UserCard } from '@/components/directory/user-card';
import { UserListSkeleton } from '@/components/directory/user-list-skeleton';
import { ProfileDrawer } from '@/components/directory/profile-drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { createDirectChannel, type UserDirectoryItem } from '@/lib/api-client';
import { IconSearch, IconUsers } from '@/components/ui/icons';

export default function DirectoryPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { client } = useStreamChatContext();

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

  const userIds = useMemo(() => users.map((u) => u.id), [users]);
  const {
    presence,
    isLoading: isPresenceLoading,
    error: presenceError,
  } = usePresence(client, userIds);

  const [profileUser, setProfileUser] = useState<UserDirectoryItem | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  async function handleMessage(user: UserDirectoryItem) {
    setMessagingId(user.id);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const { channelId } = await createDirectChannel(token, user.id);
      router.push(`/dashboard?channel=${channelId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setMessagingId(null);
    }
  }

  function handleAddToGroup() {
    router.push('/dashboard?startGroup=1');
  }

  return (
    <div className="page-container">
      <PageHeader
        title="User Directory"
        subtitle="Find and message your teammates."
        icon={<IconUsers width={20} height={20} />}
      />

      <div className="relative mb-6 max-w-sm">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width={16} height={16} />
        <Input
          type="text"
          placeholder="Search by name or email…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && <UserListSkeleton />}

      {!isLoading && error && <ErrorState message={error} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          icon={<IconSearch width={26} height={26} />}
          title="No users found"
          description="Try a different search term."
        />
      )}

      {!isLoading && !error && users.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                presence={presence.get(user.id)}
                isPresenceLoading={isPresenceLoading}
                presenceError={presenceError}
                isMessaging={messagingId === user.id}
                onMessage={handleMessage}
                onAddToGroup={handleAddToGroup}
                onViewProfile={setProfileUser}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <ProfileDrawer
        user={profileUser}
        presence={profileUser ? presence.get(profileUser.id) : undefined}
        isPresenceLoading={isPresenceLoading}
        presenceError={presenceError}
        onClose={() => setProfileUser(null)}
        onMessage={handleMessage}
      />
    </div>
  );
}
