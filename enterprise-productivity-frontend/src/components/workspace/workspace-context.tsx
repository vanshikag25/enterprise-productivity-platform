'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type WorkspaceMode =
  | { type: 'channel' }
  | { type: 'project'; projectId: string }
  | { type: 'task'; taskId: string }
  | { type: 'meeting'; meetingId: string }
  | { type: 'starred' };

interface WorkspaceContextValue {
  mode: WorkspaceMode | null;
  selectedChannelId: string | null;
  setMode: (mode: WorkspaceMode | null) => void;
  selectChannel: (channelId: string) => void;
  openProject: (projectId: string) => void;
  openTask: (taskId: string) => void;
  openMeeting: (meetingId: string) => void;
  openStarred: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  contextOpen: boolean;
  setContextOpen: (open: boolean) => void;
  closePanels: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WorkspaceMode | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setMode({ type: 'channel' });
    setSidebarOpen(false);
  }, []);

  const openProject = useCallback((projectId: string) => {
    setMode({ type: 'project', projectId });
    setSidebarOpen(false);
    setContextOpen(true);
  }, []);

  const openTask = useCallback((taskId: string) => {
    setMode({ type: 'task', taskId });
    setSidebarOpen(false);
    setContextOpen(true);
  }, []);

  const openMeeting = useCallback((meetingId: string) => {
    setMode({ type: 'meeting', meetingId });
    setSidebarOpen(false);
    setContextOpen(true);
  }, []);

  const openStarred = useCallback(() => {
    setMode({ type: 'starred' });
    setSidebarOpen(false);
    setContextOpen(true);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((v) => !v);
  }, []);

  const closePanels = useCallback(() => {
    setContextOpen(false);
    setSidebarOpen(false);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mode,
      selectedChannelId,
      setMode,
      selectChannel,
      openProject,
      openTask,
      openMeeting,
      openStarred,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      sidebarOpen,
      setSidebarOpen,
      contextOpen,
      setContextOpen,
      closePanels,
    }),
    [
      mode,
      selectedChannelId,
      setMode,
      selectChannel,
      openProject,
      openTask,
      openMeeting,
      openStarred,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      sidebarOpen,
      setSidebarOpen,
      contextOpen,
      setContextOpen,
      closePanels,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}