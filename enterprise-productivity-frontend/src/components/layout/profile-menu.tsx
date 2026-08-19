'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useClerk, useUser } from '@/lib/auth';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconUser,
} from '@/components/ui/icons';
import { useRole } from '@/hooks/use-role';
import { USER_ROLE_LABELS } from '@/lib/api-client';

const MENU_MARGIN = 8;
const MENU_MIN_EDGE = 12;

export function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const { role, me, isLoading } = useRole();
  const { signOut } = useClerk();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const measurePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + MENU_MARGIN,
      right: Math.max(MENU_MIN_EDGE, window.innerWidth - rect.right),
    });
  }, []);

  function toggleOpen() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    measurePosition();
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', measurePosition);
    window.addEventListener('scroll', measurePosition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', measurePosition);
      window.removeEventListener('scroll', measurePosition, true);
    };
  }, [isOpen, measurePosition]);

  const name = user?.fullName ?? user?.username ?? me?.firstName ?? 'User';
  const email = user?.primaryEmailAddress?.emailAddress ?? me?.email ?? '';
  const imageUrl = user?.imageUrl ?? me?.imageUrl ?? null;
  const roleLabel = role ? USER_ROLE_LABELS[role] : null;

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut({ redirectUrl: '/sign-in' });
    } catch {
      setIsLoggingOut(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        <Spinner size={16} className="text-slate-400" />
      </div>
    );
  }

  const menu =
    isOpen && position && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account"
            style={{ top: position.top, right: position.right }}
            className="fixed z-[80] max-h-[min(32rem,calc(100dvh-2rem))] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-popover animate-scale-in"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={name} imageUrl={imageUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="truncate text-xs text-slate-500">{email}</p>
                  <div className="mt-1.5">
                    {isLoading || !roleLabel ? (
                      <Badge variant="gray">Loading role…</Badge>
                    ) : (
                      <Badge variant="blue">{roleLabel}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-1.5">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
              >
                <IconUser width={17} height={17} className="text-slate-400" />
                My Profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
              >
                <IconSettings width={17} height={17} className="text-slate-400" />
                Settings
              </Link>
              <button
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Spinner size={17} />
                ) : (
                  <IconLogout width={17} height={17} />
                )}
                {isLoggingOut ? 'Signing out…' : 'Logout'}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pl-1 pr-2 shadow-sm transition-all duration-150 hover:border-slate-300 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:pl-1.5"
      >
        <Avatar name={name} imageUrl={imageUrl} size="sm" />
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 md:block">
          {name}
        </span>
        <IconChevronDown
          width={16}
          height={16}
          className={`hidden text-slate-400 transition-transform duration-150 md:block ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {menu}
    </div>
  );
}