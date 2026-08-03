import type { ReactNode } from 'react';
import { LogoMark } from '@/components/ui/icons';
import { IconChat, IconShield, IconTasks } from '@/components/ui/icons';

const FEATURES = [
  {
    icon: <IconChat width={18} height={18} />,
    title: 'Team chat',
    description: 'Real-time messaging with presence, threads, and group channels.',
  },
  {
    icon: <IconTasks width={18} height={18} />,
    title: 'Task management',
    description: 'Track tasks end-to-end with linked discussions and statuses.',
  },
  {
    icon: <IconShield width={18} height={18} />,
    title: 'Enterprise-grade',
    description: 'Role-based access, secure sessions, and modern auth.',
  },
];

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">Enterprise Productivity</p>
            <p className="text-xs uppercase tracking-wider text-slate-300/70">Productivity Suite</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              Your entire workspace,
              <br />
              in one place.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Chat, collaborate, and manage work across your organization with a fast,
              secure, and modern productivity platform.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-100">
                  {f.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{f.title}</p>
                  <p className="text-xs text-slate-400">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} Enterprise Productivity. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Enterprise Productivity</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Productivity Suite</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
