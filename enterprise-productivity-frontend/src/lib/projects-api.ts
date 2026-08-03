import { apiClient } from './api-client';

export type ProjectMemberRole = 'owner' | 'manager' | 'member' | 'guest';

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  channelId: string | null;
  memberCount: number;
  currentUserRole: ProjectMemberRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: ProjectMemberRole;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  avatarUrl?: string;
  memberIds?: string[];
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function listProjects(token: string): Promise<ProjectItem[]> {
  const res = await apiClient.get<ProjectItem[]>('/projects', { headers: headers(token) });
  return res.data;
}

export async function fetchProject(token: string, id: string): Promise<ProjectItem> {
  const res = await apiClient.get<ProjectItem>(`/projects/${id}`, { headers: headers(token) });
  return res.data;
}

export async function createProject(token: string, payload: CreateProjectPayload): Promise<ProjectItem> {
  const res = await apiClient.post<ProjectItem>('/projects', payload, { headers: headers(token) });
  return res.data;
}

export async function updateProject(
  token: string,
  id: string,
  payload: Partial<CreateProjectPayload>,
): Promise<ProjectItem> {
  const res = await apiClient.patch<ProjectItem>(`/projects/${id}`, payload, { headers: headers(token) });
  return res.data;
}

export async function deleteProject(token: string, id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`, { headers: headers(token) });
}

export async function listProjectMembers(token: string, projectId: string): Promise<ProjectMember[]> {
  const res = await apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`, { headers: headers(token) });
  return res.data;
}

export async function addProjectMember(
  token: string,
  projectId: string,
  memberId: string,
  role?: ProjectMemberRole,
): Promise<ProjectMember[]> {
  const res = await apiClient.post<ProjectMember[]>(
    `/projects/${projectId}/members`,
    { memberId, role },
    { headers: headers(token) },
  );
  return res.data;
}

export async function updateProjectMemberRole(
  token: string,
  projectId: string,
  memberId: string,
  role: ProjectMemberRole,
): Promise<ProjectMember[]> {
  const res = await apiClient.patch<ProjectMember[]>(
    `/projects/${projectId}/members/${memberId}`,
    { role },
    { headers: headers(token) },
  );
  return res.data;
}

export async function removeProjectMember(
  token: string,
  projectId: string,
  memberId: string,
): Promise<ProjectMember[]> {
  const res = await apiClient.delete<ProjectMember[]>(
    `/projects/${projectId}/members/${memberId}`,
    { headers: headers(token) },
  );
  return res.data;
}

// --- Announcements ---

export interface AnnouncementReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface AnnouncementItem {
  id: string;
  projectId: string;
  title: string;
  body: string;
  isPinned: boolean;
  authorId: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  reactions: AnnouncementReaction[];
  reactionCount: number;
}

export async function listAnnouncements(
  token: string,
  projectId: string,
  q?: string,
): Promise<AnnouncementItem[]> {
  const res = await apiClient.get<AnnouncementItem[]>(`/projects/${projectId}/announcements`, {
    headers: headers(token),
    params: q ? { q } : undefined,
  });
  return res.data;
}

export async function createAnnouncement(
  token: string,
  projectId: string,
  payload: { title: string; body: string; isPinned?: boolean },
): Promise<AnnouncementItem> {
  const res = await apiClient.post<AnnouncementItem>(
    `/projects/${projectId}/announcements`,
    payload,
    { headers: headers(token) },
  );
  return res.data;
}

export async function updateAnnouncement(
  token: string,
  projectId: string,
  id: string,
  payload: { title?: string; body?: string; isPinned?: boolean },
): Promise<AnnouncementItem> {
  const res = await apiClient.patch<AnnouncementItem>(
    `/projects/${projectId}/announcements/${id}`,
    payload,
    { headers: headers(token) },
  );
  return res.data;
}

export async function setAnnouncementPinned(
  token: string,
  projectId: string,
  id: string,
  isPinned: boolean,
): Promise<AnnouncementItem> {
  const res = await apiClient.patch<AnnouncementItem>(
    `/projects/${projectId}/announcements/${id}/pin`,
    { isPinned },
    { headers: headers(token) },
  );
  return res.data;
}

export async function deleteAnnouncement(token: string, projectId: string, id: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/announcements/${id}`, { headers: headers(token) });
}

export async function addAnnouncementReaction(
  token: string,
  projectId: string,
  id: string,
  emoji: string,
): Promise<AnnouncementItem> {
  const res = await apiClient.post<AnnouncementItem>(
    `/projects/${projectId}/announcements/${id}/reactions`,
    { emoji },
    { headers: headers(token) },
  );
  return res.data;
}

export async function removeAnnouncementReaction(
  token: string,
  projectId: string,
  id: string,
  emoji: string,
): Promise<AnnouncementItem> {
  const res = await apiClient.delete<AnnouncementItem>(
    `/projects/${projectId}/announcements/${id}/reactions/${encodeURIComponent(emoji)}`,
    { headers: headers(token) },
  );
  return res.data;
}

// --- Documents ---

export interface DocumentItem {
  id: string;
  projectId: string;
  uploaderId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  createdAt: string;
  uploaderName: string | null;
  fileUrl: string;
}

export async function listDocuments(
  token: string,
  projectId: string,
  q?: string,
): Promise<DocumentItem[]> {
  const res = await apiClient.get<DocumentItem[]>(`/projects/${projectId}/documents`, {
    headers: headers(token),
    params: q ? { q } : undefined,
  });
  return res.data;
}

export async function uploadDocument(
  token: string,
  projectId: string,
  file: File,
): Promise<DocumentItem> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<DocumentItem>(`/projects/${projectId}/documents`, form, {
    headers: { ...headers(token), 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteDocument(token: string, projectId: string, id: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/documents/${id}`, { headers: headers(token) });
}

export async function fetchDocumentBlob(token: string, projectId: string, id: string): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/projects/${projectId}/documents/${id}/download`, {
    headers: headers(token),
    responseType: 'blob',
  });
  return res.data;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIconFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('presentation')) return '📽️';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('zip')) return '🗜️';
  if (mimeType === 'text/plain') return '📃';
  return '📎';
}

export function isPreviewable(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

// --- Milestones ---

export type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'delayed',
];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
};

export interface MilestoneItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
  status: MilestoneStatus;
  progress: number;
  streamChannelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestonePayload {
  title: string;
  description?: string;
  dueDate?: string;
  ownerId?: string;
  status?: MilestoneStatus;
  progress?: number;
}

export async function listMilestones(
  token: string,
  projectId: string,
  params?: { status?: MilestoneStatus | ''; sortBy?: string },
): Promise<MilestoneItem[]> {
  const res = await apiClient.get<MilestoneItem[]>(`/projects/${projectId}/milestones`, {
    headers: headers(token),
    params,
  });
  return res.data;
}

export async function createMilestone(
  token: string,
  projectId: string,
  payload: MilestonePayload,
): Promise<MilestoneItem> {
  const res = await apiClient.post<MilestoneItem>(
    `/projects/${projectId}/milestones`,
    payload,
    { headers: headers(token) },
  );
  return res.data;
}

export async function updateMilestone(
  token: string,
  projectId: string,
  id: string,
  payload: Partial<MilestonePayload>,
): Promise<MilestoneItem> {
  const res = await apiClient.patch<MilestoneItem>(
    `/projects/${projectId}/milestones/${id}`,
    payload,
    { headers: headers(token) },
  );
  return res.data;
}

export async function updateMilestoneStatus(
  token: string,
  projectId: string,
  id: string,
  status: MilestoneStatus,
): Promise<MilestoneItem> {
  const res = await apiClient.patch<MilestoneItem>(
    `/projects/${projectId}/milestones/${id}/status`,
    { status },
    { headers: headers(token) },
  );
  return res.data;
}

export async function updateMilestoneProgress(
  token: string,
  projectId: string,
  id: string,
  progress: number,
): Promise<MilestoneItem> {
  const res = await apiClient.patch<MilestoneItem>(
    `/projects/${projectId}/milestones/${id}/progress`,
    { progress },
    { headers: headers(token) },
  );
  return res.data;
}

export async function deleteMilestone(token: string, projectId: string, id: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/milestones/${id}`, { headers: headers(token) });
}

// --- AI Summary ---

export interface AiSummary {
  overview: string;
  keyDecisions: string[];
  actionItems: string[];
  blockers: string[];
  generatedAt: string;
  provider: string;
}

export async function fetchAiSummary(token: string, projectId: string): Promise<AiSummary> {
  const res = await apiClient.get<AiSummary>(`/projects/${projectId}/ai-summary`, {
    headers: headers(token),
  });
  return res.data;
}
