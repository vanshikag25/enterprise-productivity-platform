'use client';

import Link from 'next/link';
import { getInitials } from '@/lib/initials';
import type { ProjectItem, ProjectMemberRole } from '@/lib/projects-api';
import { Badge } from '@/components/ui/badge';
import { IconArrowRight, IconUsers } from '@/components/ui/icons';

const ROLE_VARIANT: Record<ProjectMemberRole, 'amber' | 'blue' | 'gray' | 'violet'> = {
  owner: 'amber',
  manager: 'blue',
  member: 'gray',
  guest: 'violet',
};

export function ProjectCard({ project }: { project: ProjectItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="card card-hover group flex flex-col gap-3 p-4"
    >
      <div className="flex items-start gap-3">
        {project.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.avatarUrl}
            alt={project.name}
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm"
          />
        ) : (
          <div className="subtle-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-slate-700 shadow-sm">
            {getInitials(project.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-800">{project.name}</h2>
            {project.currentUserRole && (
              <Badge variant={ROLE_VARIANT[project.currentUserRole]}>
                {project.currentUserRole}
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-400">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <IconUsers width={13} height={13} />
          {project.memberCount} member{project.memberCount === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1">
          Created {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
        Open project <IconArrowRight width={13} height={13} />
      </div>
    </Link>
  );
}
