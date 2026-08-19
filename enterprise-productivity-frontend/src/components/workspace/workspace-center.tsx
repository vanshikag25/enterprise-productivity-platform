'use client';

import { useWorkspace } from './workspace-context';
import { ChannelWorkspace } from './channel-workspace';
import { ProjectWorkspace } from './project-workspace';
import { TaskWorkspace } from './task-workspace';
import { MeetingWorkspace } from './meeting-workspace';
import { StarredWorkspace } from './starred-workspace';
import { IconSearch } from '@/components/ui/icons';

export function WorkspaceCenter() {
  const { mode } = useWorkspace();

  if (!mode) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <div className="subtle-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-slate-300">
          <IconSearch width={24} height={24} />
        </div>
        <p className="text-sm font-medium text-slate-500">Select a conversation</p>
        <p className="text-xs">Pick a channel, project, task, meeting, or starred message.</p>
      </div>
    );
  }

  switch (mode.type) {
    case 'channel':
      return <ChannelWorkspace />;
    case 'project':
      return <ProjectWorkspace projectId={mode.projectId} />;
    case 'task':
      return <TaskWorkspace taskId={mode.taskId} />;
    case 'meeting':
      return <MeetingWorkspace meetingId={mode.meetingId} />;
    case 'starred':
      return <StarredWorkspace />;
    default:
      return null;
  }
}