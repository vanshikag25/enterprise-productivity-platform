'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchTasks,
  fetchMeetings,
  fetchBookmarks,
  type TaskItem,
  type MeetingItem,
  type BookmarkItem,
} from '@/lib/api-client';
import { listProjects, type ProjectItem } from '@/lib/projects-api';

export interface WorkspaceListData {
  projects: ProjectItem[];
  tasks: TaskItem[];
  meetings: MeetingItem[];
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWorkspaceListData(): WorkspaceListData {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const [p, t, m, b] = await Promise.all([
        listProjects(token),
        fetchTasks(token),
        fetchMeetings(token),
        fetchBookmarks(token),
      ]);
      setProjects(p);
      setTasks(t);
      setMeetings(m);
      setBookmarks(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data.');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return { projects, tasks, meetings, bookmarks, isLoading, error, refresh: load };
}