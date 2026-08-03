'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { listProjects, type ProjectItem } from '@/lib/projects-api';
import { hasMinRole } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectCard } from '@/components/projects/project-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { IconProject } from '@/components/ui/icons';

export default function ProjectsPage() {
  const { getToken } = useAuth();
  const { role } = useRole();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      setProjects(await listProjects(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadProjects, 0);
    return () => clearTimeout(timer);
  }, [getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const canCreate = hasMinRole(role, 'manager');

  return (
    <div className="page-container">
      <PageHeader
        title="Projects"
        subtitle="Track and collaborate on your organization's projects."
        icon={<IconProject width={20} height={20} />}
        actions={canCreate && <CreateProjectModal onCreated={(project) => setProjects((prev) => [project, ...prev])} />}
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && error && <ErrorState message={error} onRetry={loadProjects} />}
      {!isLoading && !error && projects.length === 0 && (
        <EmptyState
          icon={<IconProject width={26} height={26} />}
          title="No projects yet"
          description={canCreate ? 'Create a project to get started.' : 'You have not been added to any projects yet.'}
          action={canCreate && <CreateProjectModal onCreated={(project) => setProjects((prev) => [project, ...prev])} />}
        />
      )}

      {!isLoading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
