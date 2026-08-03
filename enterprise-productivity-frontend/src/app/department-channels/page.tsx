'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { fetchMyDepartments, type DepartmentItem } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { IconDepartment, IconMessageCircle } from '@/components/ui/icons';

export default function DepartmentChannelsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        setDepartments(await fetchMyDepartments(token));
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
        title="Department Channels"
        subtitle="Channels for the departments you belong to."
        icon={<IconDepartment width={20} height={20} />}
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex items-center justify-between p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} />}
      {!isLoading && !error && departments.length === 0 && (
        <EmptyState
          icon={<IconDepartment width={26} height={26} />}
          title="No departments"
          description="You are not assigned to any department yet."
        />
      )}

      {!isLoading && !error && departments.length > 0 && (
        <div className="data-list">
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{d.name}</p>
                {d.description && <p className="mt-0.5 truncate text-xs text-slate-400">{d.description}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{d.memberIds.length} member(s)</p>
              </div>
              {d.channelId ? (
                <Button size="sm" onClick={() => router.push(`/dashboard?channel=${d.channelId}`)}>
                  <IconMessageCircle width={15} height={15} />
                  Open Chat
                </Button>
              ) : (
                <Badge variant="gray">No channel yet</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
