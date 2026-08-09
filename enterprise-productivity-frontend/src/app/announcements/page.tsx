'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { fetchChannels, type ChannelSummary } from '@/lib/api-client';
import { CreateChannelModal } from '@/components/channels/create-channel-modal';
import { ChannelInfoDrawer } from '@/components/channels/channel-info-drawer';
import { useRole } from '@/hooks/use-role';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { IconInfo, IconMegaphone } from '@/components/ui/icons';

export default function AnnouncementsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { can } = useRole();
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChannelSummary | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        setChannels(await fetchChannels(token, 'announcement'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [getToken]);

  return (
    <div className="page-container">
      <PageHeader
        title="Announcements"
        subtitle="Broadcast important updates to the organization."
        icon={<IconMegaphone width={20} height={20} />}
        actions={can('create_announcement') && <CreateChannelModal kind="announcement" onCreated={(c) => setChannels((prev) => [c, ...prev])} />}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex items-center justify-between p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} />}
      {!isLoading && !error && channels.length === 0 && (
        <EmptyState
          icon={<IconMegaphone width={26} height={26} />}
          title="No announcement channels"
          description={can('create_announcement') ? 'Create an announcement channel to get started.' : 'Ask an admin to create an announcement channel.'}
          action={can('create_announcement') && <CreateChannelModal kind="announcement" onCreated={(c) => setChannels((prev) => [c, ...prev])} />}
        />
      )}

      {!isLoading && !error && channels.length > 0 && (
        <div className="data-list">
          {channels.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => router.push(`/dashboard?channel=${c.id}`)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-400">{c.memberCount} member(s)</p>
                </div>
              </button>
              <Badge variant="violet" className="hidden sm:inline-flex">Announcement</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelected(c)}>
                <IconInfo width={15} height={15} />
                <span className="hidden sm:inline">Info</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {selected && <ChannelInfoDrawer channel={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
