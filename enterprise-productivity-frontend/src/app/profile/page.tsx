'use client';

import { useUser } from '@clerk/nextjs';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/ui/page-header';
import { IconMail, IconShield, IconUser } from '@/components/ui/icons';
import { useRole } from '@/hooks/use-role';
import { USER_ROLE_LABELS } from '@/lib/api-client';
import { formatJoinedDate } from '@/lib/format-date';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { me, role, isLoading } = useRole();

  if (!isLoaded || (isLoading && !me)) {
    return (
      <div className="page-container">
        <FullPageSpinner label="Loading profile…" />
      </div>
    );
  }

  const name = user?.fullName ?? user?.username ?? me?.firstName ?? 'Your account';
  const email = user?.primaryEmailAddress?.emailAddress ?? me?.email ?? '';
  const imageUrl = user?.imageUrl ?? me?.imageUrl ?? null;
  const roleLabel = role ? USER_ROLE_LABELS[role] : null;

  const fields: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'Full name', value: name, icon: <IconUser width={16} height={16} /> },
    { label: 'Email address', value: email, icon: <IconMail width={16} height={16} /> },
    { label: 'Role', value: roleLabel ?? '—', icon: <IconShield width={16} height={16} /> },
  ];

  return (
    <div className="page-container max-w-3xl">
      <PageHeader
        title="My Profile"
        subtitle="Your account details and role within the organization."
        icon={<IconUser width={20} height={20} />}
      />

      <Card className="overflow-hidden">
        <div className="brand-gradient h-24" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between">
            <div className="rounded-full ring-4 ring-white">
              <Avatar name={name} imageUrl={imageUrl} size="xl" />
            </div>
            {roleLabel && <Badge variant="blue">{roleLabel}</Badge>}
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{name}</h2>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </Card>

      <Card className="mt-6 divide-y divide-slate-100">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              {field.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{field.label}</p>
              <p className="truncate text-sm font-medium text-slate-800">{field.value}</p>
            </div>
          </div>
        ))}
        {user?.createdAt && (
          <div className="flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <IconUser width={16} height={16} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Member since</p>
              <p className="text-sm font-medium text-slate-800">{formatJoinedDate(user.createdAt.toString())}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
