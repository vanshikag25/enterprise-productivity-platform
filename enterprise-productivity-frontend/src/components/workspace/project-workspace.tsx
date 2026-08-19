'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchProject, type ProjectItem } from '@/lib/projects-api';
import { hasMinRole } from '@/lib/api-client';
import { useRole } from '@/hooks/use-role';
import { getInitials } from '@/lib/initials';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { ProjectChatTab } from '@/components/projects/project-chat-tab';
import { AnnouncementsTab } from '@/components/projects/announcements-tab';
import { DocumentsTab } from '@/components/projects/documents-tab';
import { AiSummaryTab } from '@/components/projects/ai-summary-tab';
import { MilestonesTab } from '@/components/projects/milestones-tab';
import { ProjectSettingsDrawer } from '@/components/projects/project-settings-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useWorkspace } from './workspace-context';
import { IconClose, IconSettings } from '@/components/ui/icons';

const TAB_ITEMS: TabItem[] = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'announcements', label: 'Announcements', icon: '📢' },
  { key: 'documents', label: 'Shared Documents', icon: '📁' },
  { key: 'ai-summary', label: 'AI Summary', icon: '🤖' },
  { key: 'milestones', label: 'Milestones', icon: '🎯' },
];

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { getToken } = useAuth();
  const { role } = useRole();
  const { setMode } = useWorkspace();

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setActiveTab('chat');
    setShowSettings(false);
    setProject(null);
    setIsLoading(true);
    setError(null);

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Unable to retrieve Clerk session token.');
        const data = await fetchProject(token, projectId);
        if (!cancelled) setProject(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, getToken]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <SkeletonCard className="h-14" />
        <SkeletonCard className="h-40" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState message={error ?? 'Project not found.'} />
      </div>
    );
  }

  const isOrgManager = hasMinRole(role, 'manager');
  const canManage =
    project.currentUserRole === 'owner' ||
    project.currentUserRole === 'manager' ||
    isOrgManager;
  const canDelete = project.currentUserRole === 'owner' || hasMinRole(role, 'admin');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {project.avatarUrl ? (
            <img
              src={project.avatarUrl}
              alt={project.name}
              className="h-11 w-11 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700">
              {getInitials(project.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{project.name}</h1>
            <p className="truncate text-xs text-gray-500">
              {project.description || 'No description provided.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            👥 {project.memberCount} members
          </span>
          {canManage && (
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <IconSettings width={14} height={14} />
              Manage
            </button>
          )}
          <button
            onClick={() => setMode(null)}
            aria-label="Close project"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>
      </div>

      <Tabs items={TAB_ITEMS} activeKey={activeTab} onChange={setActiveTab} />

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'chat' && <ProjectChatTab channelId={project.channelId} />}
        {activeTab === 'announcements' && (
          <AnnouncementsTab project={project} canManage={canManage} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab project={project} canManage={canManage} />
        )}
        {activeTab === 'ai-summary' && (
          <AiSummaryTab projectId={project.id} projectName={project.name} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab project={project} canManage={canManage} />
        )}
      </div>

      {showSettings && (
        <ProjectSettingsDrawer
          project={project}
          canDelete={canDelete}
          onClose={() => setShowSettings(false)}
          onUpdated={setProject}
          onDeleted={() => setMode(null)}
        />
      )}
    </div>
  );
}