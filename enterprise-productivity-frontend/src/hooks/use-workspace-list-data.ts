'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchTasks,
  fetchMeetings,
  fetchBookmarks,
  fetchMyDepartments,
  type TaskItem,
  type MeetingItem,
  type BookmarkItem,
  type DepartmentItem,
} from '@/lib/api-client';
import { listProjects, type ProjectItem } from '@/lib/projects-api';

export interface WorkspaceListData {
  projects: ProjectItem[];
  tasks: TaskItem[];
  meetings: MeetingItem[];
  departments: DepartmentItem[];
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
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Unable to retrieve Clerk session token.');
      const [p, t, m, d, b] = await Promise.all([
        listProjects(token),
        fetchTasks(token),
        fetchMeetings(token),
        fetchMyDepartments(token),
        fetchBookmarks(token),
      ]);
      setProjects(p);
      setTasks(t);
      setMeetings(m);
      setDepartments(d);
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

  return { projects, tasks, meetings, departments, bookmarks, isLoading, error, refresh: load };
}