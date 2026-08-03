'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { SidebarAccount } from '@/components/layout/sidebar-account';
import { useRole } from '@/hooks/use-role';
import { hasMinRole, type UserRole } from '@/lib/api-client';
import {
  IconBuilding,
  IconCalendar,
  IconChat,
  IconChevronsLeft,
  IconChevronsRight,
  IconClose,
  IconDepartment,
  IconMenu,
  IconMegaphone,
  IconProject,
  IconShield,
  IconTasks,
  IconUsers,
} from '@/components/ui/icons';

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ReactNode;
  minRole?: UserRole;
}[] = [
  { href: '/dashboard', label: 'Chat', icon: <IconChat width={18} height={18} /> },
  { href: '/directory', label: 'Directory', icon: <IconUsers width={18} height={18} /> },
  { href: '/tasks', label: 'Tasks', icon: <IconTasks width={18} height={18} /> },
  { href: '/meetings', label: 'Meetings', icon: <IconCalendar width={18} height={18} /> },
  { href: '/announcements', label: 'Announcements', icon: <IconMegaphone width={18} height={18} /> },
  { href: '/organization-channels', label: 'Org Channels', icon: <IconBuilding width={18} height={18} /> },
  { href: '/department-channels', label: 'Departments', icon: <IconDepartment width={18} height={18} /> },
  { href: '/projects', label: 'Projects', icon: <IconProject width={18} height={18} /> },
  { href: '/admin/roles', label: 'Admin', icon: <IconShield width={18} height={18} />, minRole: 'admin' },
];

function getPageTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (match) return match.label;
  if (pathname === '/profile') return 'My Profile';
  if (pathname === '/settings') return 'Settings';
  return 'Enterprise Productivity';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useRole();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  if (isAuthPage) return <>{children}</>;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.minRole || hasMinRole(role, item.minRole),
  );

  const title = getPageTitle(pathname ?? '');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-slate-900 text-slate-100 transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-[76px]' : 'md:w-64'} w-72`}
      >
        <div className={`flex h-16 items-center border-b border-white/10 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold tracking-tight text-white ring-1 ring-white/10">
              EP
            </span>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-white">Enterprise Productivity</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-slate-300/70">Productivity Suite</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400/80 ${isCollapsed ? 'sr-only' : ''}`}>
            Workspace
          </p>
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-white/15 text-white shadow-inner'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
                    )}
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <SidebarAccount collapsed={isCollapsed} />

        <div className="p-3">
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:flex"
          >
            {isCollapsed ? <IconChevronsRight width={16} height={16} /> : <IconChevronsLeft width={16} height={16} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
            >
              <IconMenu width={20} height={20} />
            </button>
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <NotificationBell />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <ProfileMenu />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
