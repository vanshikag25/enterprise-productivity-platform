'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchChannels, joinChannel, leaveChannel, type ChannelSummary } from '@/lib/api-client';
import { CreateChannelModal } from '@/components/channels/create-channel-modal';
import { ChannelInfoDrawer } from '@/components/channels/channel-info-drawer';
import { useRole } from '@/hooks/use-role';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { IconBuilding, IconInfo } from '@/components/ui/icons';

export default function OrganizationChannelsPage() {
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { can } = useRole();
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ChannelSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setChannels(await fetchChannels(token, 'organization'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => channels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())), [channels, search]);

  async function handleJoinLeave(c: ChannelSummary, action: 'join' | 'leave') {
    const token = await getToken();
    if (!token) return;
    setBusyId(c.id);
    try {
      await (action === 'join' ? joinChannel : leaveChannel)(token, c.id);
      showToast(action === 'join' ? 'Joined.' : 'Left.');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Organization Channels"
        subtitle="Cross-team channels for the whole company."
        icon={<IconBuilding width={20} height={20} />}
        actions={can('create_channel') && <CreateChannelModal kind="organization" onCreated={(c) => setChannels((prev) => [c, ...prev])} />}
      />

      <Input
        type="search"
        placeholder="Search channels…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 min-w-[200px] sm:max-w-xs"
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex items-center justify-between p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={load} />}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<IconBuilding width={26} height={26} />}
          title="No channels found"
          description={search ? 'Try a different search term.' : 'Create a channel to get started.'}
          action={can('create_channel') && <CreateChannelModal kind="organization" onCreated={(c) => setChannels((prev) => [c, ...prev])} />}
        />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="data-list">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setSelected(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="subtle-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-slate-700 shadow-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-400">{c.memberCount} member(s)</p>
                </div>
              </button>
              <Button variant="outline" size="sm" onClick={() => handleJoinLeave(c, 'join')} disabled={busyId === c.id}>
                {busyId === c.id ? '…' : 'Join'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleJoinLeave(c, 'leave')} disabled={busyId === c.id}>
                Leave
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(c)} aria-label="Info">
                <IconInfo width={15} height={15} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {selected && <ChannelInfoDrawer channel={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
