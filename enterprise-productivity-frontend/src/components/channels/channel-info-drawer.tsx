'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { fetchChannelMembers, addChannelMember, removeChannelMember, type ChannelSummary, type ChannelMember } from '@/lib/api-client';
import { useUserSearch } from '@/hooks/use-user-search';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/form';
import { IconClose, IconMessageCircle, IconPlus, IconTrash } from '@/components/ui/icons';

interface ChannelInfoDrawerProps {
  channel: ChannelSummary;
  onClose: () => void;
}

export function ChannelInfoDrawer({ channel, onClose }: ChannelInfoDrawerProps) {
  const { getToken, userId } = useAuth();
  const { showToast } = useToast();
  const { can } = useRole();
  const router = useRouter();
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const { users, searchTerm, setSearchTerm } = useUserSearch();

  const canManage = channel.createdBy === userId || can('create_channel');

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      setMembers(await fetchChannelMembers(token, channel.id));
    })();
  }, [channel.id, getToken]);

  async function handleAdd(userId: string) {
    const token = await getToken();
    if (!token) return;
    try {
      await addChannelMember(token, channel.id, userId);
      setMembers(await fetchChannelMembers(token, channel.id));
      showToast('Member added.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add member.', 'error');
    }
  }

  async function handleRemove(userId: string) {
    const token = await getToken();
    if (!token) return;
    try {
      await removeChannelMember(token, channel.id, userId);
      setMembers(await fetchChannelMembers(token, channel.id));
      showToast('Member removed.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove member.', 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur">
          <h2 className="text-base font-semibold text-slate-900">Channel info</h2>
          <button onClick={onClose} aria-label="Close" className="btn-icon btn-ghost rounded-lg text-slate-400 hover:text-slate-600">
            <IconClose width={18} height={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-semibold text-white shadow-sm">
              {channel.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">{channel.name}</h3>
              <Badge variant="blue" className="mt-1 capitalize">{channel.kind}</Badge>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{channel.description || 'No description.'}</p>

          <dl className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Members</dt>
              <dd className="text-slate-800">{channel.memberCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</dt>
              <dd className="text-slate-800">{new Date(channel.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          <Button className="mt-4 w-full" onClick={() => router.push(`/dashboard?channel=${channel.id}`)}>
            <IconMessageCircle width={16} height={16} />
            Open Channel
          </Button>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Members</h3>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)}>
                  <IconPlus width={14} height={14} />
                  {showAdd ? 'Cancel' : 'Add'}
                </Button>
              )}
            </div>

            {showAdd && (
              <div className="mb-2">
                <Input placeholder="Search users…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <ul className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-100">
                  {users.map((u) => (
                    <li key={u.id}>
                      <button onClick={() => handleAdd(u.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50">
                        <Avatar name={u.name} imageUrl={u.imageUrl} size="sm" />
                        <span className="truncate">{u.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="data-list">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={m.name ?? 'Unknown'} imageUrl={m.imageUrl} size="sm" />
                    <span className="truncate text-slate-800">{m.name}</span>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id)} aria-label={`Remove ${m.name}`} className="text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <IconTrash width={15} height={15} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
