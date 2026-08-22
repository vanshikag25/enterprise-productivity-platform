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
  | { type: 'starred' };

interface WorkspaceContextValue {
  mode: WorkspaceMode | null;
  selectedChannelId: string | null;
  setMode: (mode: WorkspaceMode | null) => void;
  selectChannel: (channelId: string) => void;
  openProject: (projectId: string) => void;
  openTask: (taskId: string) => void;
  openStarred: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
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

  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setMode({ type: 'channel' });
    setSidebarOpen(false);
  }, []);

  const openProject = useCallback((projectId: string) => {
    setMode({ type: 'project', projectId });
    setSidebarOpen(false);
  }, []);

  const openTask = useCallback((taskId: string) => {
    setMode({ type: 'task', taskId });
    setSidebarOpen(false);
  }, []);

  const openStarred = useCallback(() => {
    setMode({ type: 'starred' });
    setSidebarOpen(false);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((v) => !v);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mode,
      selectedChannelId,
      setMode,
      selectChannel,
      openProject,
      openTask,
      openStarred,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      sidebarOpen,
      setSidebarOpen,
    }),
    [
      mode,
      selectedChannelId,
      setMode,
      selectChannel,
      openProject,
      openTask,
      openStarred,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      sidebarOpen,
      setSidebarOpen,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}