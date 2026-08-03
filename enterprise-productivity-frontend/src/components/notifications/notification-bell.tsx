'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
import { requestBrowserNotificationPermission } from '@/hooks/use-browser-notifications';
import { IconBell, IconCheck } from '@/components/ui/icons';

const ICON_CLASSES: Record<string, string> = {
  direct_message: 'text-blue-500 bg-blue-50',
  group_message: 'text-indigo-500 bg-indigo-50',
  mention: 'text-violet-500 bg-violet-50',
  task_assigned: 'text-amber-500 bg-amber-50',
  task_updated: 'text-amber-500 bg-amber-50',
  meeting_invitation: 'text-cyan-500 bg-cyan-50',
  meeting_updated: 'text-cyan-500 bg-cyan-50',
  announcement: 'text-red-500 bg-red-50',
  added_to_group: 'text-emerald-500 bg-emerald-50',
  added_to_department: 'text-slate-500 bg-slate-100',
};

const ICON_LABELS: Record<string, string> = {
  direct_message: 'Message',
  group_message: 'Message',
  mention: 'Mention',
  task_assigned: 'Task',
  task_updated: 'Task',
  meeting_invitation: 'Meeting',
  meeting_updated: 'Meeting',
  announcement: 'Announcement',
  added_to_group: 'Group',
  added_to_department: 'Department',
};

function timeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const { items, unreadCount, isLoading, markRead, markAllRead } = useNotifications();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { requestBrowserNotificationPermission(); }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        className={`btn-icon btn-ghost rounded-lg transition-colors ${isOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <IconBell width={19} height={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[28rem] w-[22rem] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-popover animate-scale-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                <IconCheck width={13} height={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && <p className="p-4 text-xs text-slate-400">Loading…</p>}
            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <div className="subtle-gradient flex h-11 w-11 items-center justify-center rounded-xl text-slate-400">
                  <IconBell width={20} height={20} />
                </div>
                <p className="text-sm font-medium text-slate-600">You&apos;re all caught up</p>
                <p className="text-xs text-slate-400">New activity will appear here.</p>
              </div>
            )}
            {!isLoading && items.length > 0 && (
              <ul>
                {items.map((n) => (
                  <li key={n.id} className={n.isRead ? '' : 'bg-blue-50/60'}>
                    <button
                      onClick={() => {
                        markRead(n.id);
                        setIsOpen(false);
                        if (n.actionUrl) router.push(n.actionUrl);
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${ICON_CLASSES[n.type] ?? 'bg-slate-100 text-slate-400'}`}>
                        {ICON_LABELS[n.type]?.charAt(0) ?? '•'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{n.title}</span>
                        {n.description && <span className="block truncate text-xs text-slate-400">{n.description}</span>}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
