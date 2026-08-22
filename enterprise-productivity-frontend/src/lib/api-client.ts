import axios from 'axios';
import type { ManualStatus } from './user-status';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL is not set. Check your .env.local file.');

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.response.use(
  (response) => response,
  (err) => {
    if (axios.isAxiosError(err)) {
      const serverMessage = (err.response?.data as { message?: string | string[] } | undefined)?.message;
      if (serverMessage) err.message = Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage;
    }
    return Promise.reject(err);
  },
);

export type UserRole = 'super_admin' | 'organization_owner' | 'admin' | 'manager' | 'team_lead' | 'employee' | 'guest';

export const USER_ROLES: UserRole[] = ['super_admin', 'organization_owner', 'admin', 'manager', 'team_lead', 'employee', 'guest'];

export const USER_ROLE_RANK: Record<UserRole, number> = {
  super_admin: 100,
  organization_owner: 90,
  admin: 80,
  manager: 60,
  team_lead: 50,
  employee: 30,
  guest: 10,
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  organization_owner: 'Organization Owner',
  admin: 'Admin',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  guest: 'Guest',
};

export function hasMinRole(role: string | null | undefined, minimum: UserRole): boolean {
  if (!role || !(role in USER_ROLE_RANK)) return false;
  return USER_ROLE_RANK[role as UserRole] >= USER_ROLE_RANK[minimum];
}

export interface ChatTokenResponse { streamToken: string; apiKey: string; }
export async function fetchChatToken(clerkToken: string): Promise<ChatTokenResponse> {
  const res = await apiClient.get<ChatTokenResponse>('/chat/token', { headers: { Authorization: `Bearer ${clerkToken}` } });
  return res.data;
}

// --- Voice / video calls (Stream Video) ---
export interface VideoConnectResponse {
  apiKey: string;
  userId: string;
  token: string;
}
export interface VideoTokenResponse extends VideoConnectResponse {
  memberIds: string[];
}

export async function fetchVideoConnect(clerkToken: string): Promise<VideoConnectResponse> {
  const res = await apiClient.post<VideoConnectResponse>(
    '/video/connect',
    {},
    { headers: { Authorization: `Bearer ${clerkToken}` } },
  );
  return res.data;
}

export async function fetchVideoToken(
  clerkToken: string,
  payload: { channelId: string; kind: 'dm' | 'group' },
): Promise<VideoTokenResponse> {
  const res = await apiClient.post<VideoTokenResponse>(
    '/video/token',
    payload,
    { headers: { Authorization: `Bearer ${clerkToken}` } },
  );
  return res.data;
}

export interface UserDirectoryItem {
  id: string; name: string; email: string; imageUrl: string | null;
  online: boolean; lastSeen: string | null; department?: string; organization?: string; joinedAt: string; role: UserRole; status?: string | null;
}
export interface UserDirectoryResponse { users: UserDirectoryItem[]; total: number; page: number; limit: number; totalPages: number; }
export interface FetchUsersDirectoryParams {
  search?: string; page?: number; limit?: number;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt'; sortOrder?: 'asc' | 'desc';
}
export async function fetchUsersDirectory(clerkToken: string, params: FetchUsersDirectoryParams = {}): Promise<UserDirectoryResponse> {
  const res = await apiClient.get<UserDirectoryResponse>('/users', { headers: { Authorization: `Bearer ${clerkToken}` }, params });
  return res.data;
}

export interface MeResponse {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  imageUrl: string | null;
  role: UserRole;
  preferredLanguage: string;
  status?: string | null;
  createdAt: string;
}
export async function fetchMe(token: string): Promise<MeResponse> {
  const res = await apiClient.get<MeResponse>('/users/me', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateUserRole(token: string, username: string, role: UserRole): Promise<MeResponse> {
  const res = await apiClient.patch<MeResponse>(`/users/${encodeURIComponent(username)}/role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function removeUser(token: string, username: string): Promise<void> {
  await apiClient.delete(`/users/${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${token}` } });
}

// --- Self-hosted auth ---
export interface AuthSessionResponse {
  token: string;
  user: MeResponse;
}

export async function loginRequest(payload: {
  username: string;
  password: string;
}): Promise<AuthSessionResponse> {
  const res = await apiClient.post<AuthSessionResponse>('/auth/login', payload);
  return res.data;
}

export async function registerRequest(payload: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthSessionResponse> {
  const res = await apiClient.post<AuthSessionResponse>('/auth/register', payload);
  return res.data;
}

export async function updateProfileRequest(
  token: string,
  payload: {
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    preferredLanguage?: string;
  },
): Promise<MeResponse> {
  const res = await apiClient.patch<MeResponse>('/users/me', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function updateMyStatus(
  token: string,
  status: ManualStatus | null,
): Promise<MeResponse> {
  const res = await apiClient.patch<MeResponse>(
    '/users/me/status',
    { status },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function changePasswordRequest(
  token: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<{ updated: boolean }> {
  const res = await apiClient.post<{ updated: boolean }>('/users/me/password', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function changeUsernameRequest(
  token: string,
  username: string,
): Promise<AuthSessionResponse> {
  const res = await apiClient.post<AuthSessionResponse>(
    '/users/me/username',
    { username },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function createDirectChannel(clerkToken: string, targetUserId: string): Promise<{ channelId: string }> {
  const res = await apiClient.post<{ channelId: string }>('/chat/direct', { targetUserId }, { headers: { Authorization: `Bearer ${clerkToken}` } });
  return res.data;
}

export interface CreateGroupChannelResponse { channelId: string; name: string | undefined; description: string | undefined; memberIds: string[]; }
export async function createGroupChannel(clerkToken: string, groupName: string, memberIds: string[], description?: string): Promise<CreateGroupChannelResponse> {
  const res = await apiClient.post<CreateGroupChannelResponse>('/chat/group', { groupName, memberIds, description }, { headers: { Authorization: `Bearer ${clerkToken}` } });
  return res.data;
}

// --- Group chat management ---
export type GroupMemberRole = 'owner' | 'moderator' | 'member';
export type GroupUserRole = GroupMemberRole | 'admin';
export interface GroupMemberInfo {
  id: string;
  name: string | null;
  imageUrl: string | null;
  role: GroupMemberRole;
}
export interface GroupInfo {
  channelId: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  createdById: string;
  currentUserRole: GroupUserRole;
  canManage: boolean;
  canManageModerators: boolean;
  members: GroupMemberInfo[];
}

export async function fetchGroupInfo(token: string, channelId: string): Promise<GroupInfo> {
  const res = await apiClient.get<GroupInfo>(`/chat/groups/${channelId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateGroupInfo(token: string, channelId: string, payload: { name?: string; description?: string }): Promise<GroupInfo> {
  const res = await apiClient.patch<GroupInfo>(`/chat/groups/${channelId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateGroupAvatar(token: string, channelId: string, avatarUrl: string): Promise<GroupInfo> {
  const res = await apiClient.put<GroupInfo>(`/chat/groups/${channelId}/avatar`, { avatarUrl }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function removeGroupAvatar(token: string, channelId: string): Promise<GroupInfo> {
  const res = await apiClient.delete<GroupInfo>(`/chat/groups/${channelId}/avatar`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function addGroupMember(token: string, channelId: string, memberId: string): Promise<GroupInfo> {
  const res = await apiClient.post<GroupInfo>(`/chat/groups/${channelId}/members/${memberId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function removeGroupMember(token: string, channelId: string, memberId: string): Promise<GroupInfo> {
  const res = await apiClient.delete<GroupInfo>(`/chat/groups/${channelId}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function assignGroupModerator(token: string, channelId: string, memberId: string): Promise<GroupInfo> {
  const res = await apiClient.post<GroupInfo>(`/chat/groups/${channelId}/moderators/${memberId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function removeGroupModerator(token: string, channelId: string, memberId: string): Promise<GroupInfo> {
  const res = await apiClient.delete<GroupInfo>(`/chat/groups/${channelId}/moderators/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function leaveGroup(token: string, channelId: string): Promise<void> {
  await apiClient.post(`/chat/groups/${channelId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
}

// --- Tasks ---
export interface TaskItem {
  id: string; title: string; description: string | null; status: string; priority: string;
  dueDate: string | null; createdBy: string; assignee: string | null; streamChannelId: string | null;
  createdAt: string; updatedAt: string;
}
export interface TaskPayload {
  title: string; description?: string; priority?: string; status?: string; dueDate?: string; assignee?: string;
}

export async function fetchTasks(token: string): Promise<TaskItem[]> {
  const res = await apiClient.get<TaskItem[]>('/tasks', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function fetchTask(token: string, id: string): Promise<TaskItem> {
  const res = await apiClient.get<TaskItem>(`/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function createTask(token: string, payload: TaskPayload): Promise<TaskItem> {
  const res = await apiClient.post<TaskItem>('/tasks', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateTask(token: string, id: string, payload: Partial<TaskPayload>): Promise<TaskItem> {
  const res = await apiClient.patch<TaskItem>(`/tasks/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateTaskStatus(token: string, id: string, status: string): Promise<TaskItem> {
  const res = await apiClient.patch<TaskItem>(`/tasks/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function getOrCreateTaskChannel(token: string, id: string): Promise<{ channelId: string }> {
  const res = await apiClient.post<{ channelId: string }>(`/tasks/${id}/channel`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteTask(token: string, id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
// --- Meetings ---
export interface MeetingItem {
  id: string; title: string; description: string | null;
  agenda: string | null; notes: string | null; attachments: string[];
  recordingLink: string | null; meetingCode: string | null; meetingUrl: string | null; scheduledDate: string; startTime: string; endTime: string;
  organizerId: string; participants: string[]; meetingStatus: string;
  meetingChatChannelId: string | null; createdAt: string; updatedAt: string;
}
export interface MeetingPayload {
  title: string; description?: string; agenda?: string; notes?: string;
  attachments?: string[]; recordingLink?: string; meetingCode?: string; meetingUrl?: string; meetingStatus?: string;
  scheduledDate: string; startTime: string; endTime: string; participants: string[];
  sourceChannelId?: string; sourceMessageId?: string;
  sourceSenderId?: string; sourceChannelName?: string;
}

export async function fetchMeetings(token: string): Promise<MeetingItem[]> {
  const res = await apiClient.get<MeetingItem[]>('/meetings', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function fetchMeetingByCode(token: string, code: string): Promise<MeetingItem> {
  const res = await apiClient.get<MeetingItem>(`/meetings/code/${encodeURIComponent(code)}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function createMeeting(token: string, payload: MeetingPayload): Promise<MeetingItem> {
  const res = await apiClient.post<MeetingItem>('/meetings', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateMeeting(token: string, id: string, payload: Partial<MeetingPayload>): Promise<MeetingItem> {
  const res = await apiClient.patch<MeetingItem>(`/meetings/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteMeeting(token: string, id: string): Promise<void> {
  await apiClient.delete(`/meetings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
export async function joinMeeting(token: string, id: string): Promise<MeetingItem> {
  const res = await apiClient.post<MeetingItem>(`/meetings/${id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function leaveMeeting(token: string, id: string): Promise<MeetingItem> {
  const res = await apiClient.post<MeetingItem>(`/meetings/${id}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateMeetingStatus(token: string, id: string, status: string): Promise<MeetingItem> {
  const res = await apiClient.patch<MeetingItem>(`/meetings/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
// --- Channels / Departments ---
export interface ChannelSummary {
  id: string; name: string; description: string; kind: string;
  departmentId: string | null; createdBy: string; createdAt: string; memberCount: number; frozen: boolean;
}
export interface DepartmentItem {
  id: string; name: string; description: string | null; managerId: string | null; memberIds: string[]; channelId: string | null; createdBy: string; createdAt: string;
}
export interface ChannelMember { id: string; name: string; imageUrl: string | null; }

export async function fetchChannels(token: string, kind: string): Promise<ChannelSummary[]> {
  const res = await apiClient.get<ChannelSummary[]>('/channels', { headers: { Authorization: `Bearer ${token}` }, params: { kind } });
  return res.data;
}
export async function createChannel(token: string, payload: { kind: string; name: string; description?: string; memberIds?: string[]; departmentId?: string }): Promise<ChannelSummary> {
  const res = await apiClient.post<ChannelSummary>('/channels', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateChannel(token: string, id: string, payload: { name?: string; description?: string }): Promise<ChannelSummary> {
  const res = await apiClient.patch<ChannelSummary>(`/channels/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteChannel(token: string, id: string): Promise<void> {
  await apiClient.delete(`/channels/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
export async function joinChannel(token: string, id: string): Promise<ChannelSummary> {
  const res = await apiClient.post<ChannelSummary>(`/channels/${id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function leaveChannel(token: string, id: string): Promise<ChannelSummary> {
  const res = await apiClient.post<ChannelSummary>(`/channels/${id}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function fetchChannelMembers(token: string, id: string): Promise<ChannelMember[]> {
  const res = await apiClient.get<ChannelMember[]>(`/channels/${id}/members`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function addChannelMember(token: string, id: string, memberId: string): Promise<ChannelSummary> {
  const res = await apiClient.post<ChannelSummary>(`/channels/${id}/members/${memberId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function removeChannelMember(token: string, id: string, memberId: string): Promise<ChannelSummary> {
  const res = await apiClient.delete<ChannelSummary>(`/channels/${id}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

export async function fetchMyDepartments(token: string): Promise<DepartmentItem[]> {
  const res = await apiClient.get<DepartmentItem[]>('/departments/mine', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function createDepartment(token: string, payload: { name: string; description?: string; managerId?: string; memberIds?: string[] }): Promise<DepartmentItem> {
  const res = await apiClient.post<DepartmentItem>('/departments', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateDepartment(token: string, id: string, payload: { name?: string; description?: string; managerId?: string; memberIds?: string[] }): Promise<DepartmentItem> {
  const res = await apiClient.patch<DepartmentItem>(`/departments/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteDepartment(token: string, id: string): Promise<void> {
  await apiClient.delete(`/departments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
export async function addDepartmentMember(token: string, id: string, memberId: string): Promise<DepartmentItem> {
  const res = await apiClient.post<DepartmentItem>(`/departments/${id}/members/${memberId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function removeDepartmentMember(token: string, id: string, memberId: string): Promise<DepartmentItem> {
  const res = await apiClient.delete<DepartmentItem>(`/departments/${id}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export interface NotificationItem {
  id: string; userId: string; type: string; title: string;
  description: string | null; actionUrl: string | null; isRead: boolean; createdAt: string;
}

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const res = await apiClient.get<NotificationItem[]>('/notifications', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function fetchUnreadCount(token: string): Promise<number> {
  const res = await apiClient.get<number>('/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function markNotificationRead(token: string, id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
}
export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiClient.patch('/notifications/read-all', {}, { headers: { Authorization: `Bearer ${token}` } });
}
export async function createSelfNotification(
  token: string,
  payload: { type: string; title: string; description?: string; actionUrl?: string },
): Promise<void> {
  await apiClient.post('/notifications/self', payload, { headers: { Authorization: `Bearer ${token}` } });
}

// --- Message actions: Notes ---
export interface NoteItem {
  id: string; userId: string; title: string; content: string;
  sourceChannelId: string | null; sourceMessageId: string | null;
  sourceSenderId: string | null; sourceChannelName: string | null;
  sourceMessageText: string | null; createdAt: string; updatedAt: string;
}
export interface NotePayload {
  title: string; content: string;
  sourceChannelId?: string; sourceMessageId?: string;
  sourceSenderId?: string; sourceChannelName?: string; sourceMessageText?: string;
}

export async function fetchNotes(token: string, search?: string): Promise<NoteItem[]> {
  const res = await apiClient.get<NoteItem[]>('/notes', {
    headers: { Authorization: `Bearer ${token}` },
    params: search ? { search } : undefined,
  });
  return res.data;
}
export async function createNote(token: string, payload: NotePayload): Promise<NoteItem> {
  const res = await apiClient.post<NoteItem>('/notes', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateNote(token: string, id: string, payload: Partial<NotePayload>): Promise<NoteItem> {
  const res = await apiClient.patch<NoteItem>(`/notes/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteNote(token: string, id: string): Promise<void> {
  await apiClient.delete(`/notes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// --- Message actions: Reminders ---
export type ReminderPriority = 'Low' | 'Medium' | 'High';
export interface ReminderItem {
  id: string; userId: string; title: string; scheduledFor: string;
  priority: ReminderPriority; notes: string | null;
  sourceChannelId: string | null; sourceMessageId: string | null;
  sourceSenderId: string | null; sourceChannelName: string | null;
  isTriggered: boolean; createdAt: string; updatedAt: string;
}
export interface ReminderPayload {
  title: string; scheduledFor: string; priority?: ReminderPriority; notes?: string;
  sourceChannelId?: string; sourceMessageId?: string;
  sourceSenderId?: string; sourceChannelName?: string;
}

export async function fetchReminders(token: string, includeTriggered = false): Promise<ReminderItem[]> {
  const res = await apiClient.get<ReminderItem[]>('/reminders', {
    headers: { Authorization: `Bearer ${token}` },
    params: includeTriggered ? { includeTriggered: 'true' } : undefined,
  });
  return res.data;
}
export async function createReminder(token: string, payload: ReminderPayload): Promise<ReminderItem> {
  const res = await apiClient.post<ReminderItem>('/reminders', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updateReminder(token: string, id: string, payload: Partial<ReminderPayload>): Promise<ReminderItem> {
  const res = await apiClient.patch<ReminderItem>(`/reminders/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteReminder(token: string, id: string): Promise<void> {
  await apiClient.delete(`/reminders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
export async function triggerReminder(token: string, id: string): Promise<ReminderItem> {
  const res = await apiClient.post<ReminderItem>(`/reminders/${id}/trigger`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}

// --- Message actions: Bookmarks ---
export interface BookmarkItem {
  id: string; userId: string; sourceChannelId: string; sourceMessageId: string;
  sourceSenderId: string | null; sourceChannelName: string | null;
  sourceMessageText: string | null; sourceSenderName: string | null; createdAt: string;
}
export interface BookmarkPayload {
  sourceChannelId: string; sourceMessageId: string;
  sourceSenderId?: string; sourceChannelName?: string;
  sourceMessageText?: string; sourceSenderName?: string;
}

export async function fetchBookmarks(
  token: string,
  params: { channelId?: string; search?: string } = {},
): Promise<BookmarkItem[]> {
  const res = await apiClient.get<BookmarkItem[]>('/bookmarks', {
    headers: { Authorization: `Bearer ${token}` },
    params: params.channelId || params.search ? params : undefined,
  });
  return res.data;
}
export async function createBookmark(token: string, payload: BookmarkPayload): Promise<BookmarkItem> {
  const res = await apiClient.post<BookmarkItem>('/bookmarks', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deleteBookmark(token: string, id: string): Promise<void> {
  await apiClient.delete(`/bookmarks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
export async function fetchBookmarkByMessage(token: string, messageId: string): Promise<BookmarkItem | null> {
  const res = await apiClient.get<BookmarkItem | null>(`/bookmarks/by-message/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// --- Polls ---
export interface PollItem {
  id: string;
  streamPollId: string;
  channelId: string;
  messageId: string;
  question: string;
  createdBy: string;
  deadline: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePollPayload {
  channelId: string;
  question: string;
  options: string[];
  multipleAnswers?: boolean;
  anonymous?: boolean;
  deadline?: string;
}
export interface UpdatePollPayload {
  question?: string;
  options?: string[];
}
export interface CreatePollResult {
  streamPollId: string;
  messageId: string;
}

export async function createPoll(token: string, payload: CreatePollPayload): Promise<CreatePollResult> {
  const res = await apiClient.post<CreatePollResult>('/polls', payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function fetchPolls(token: string, channelId: string): Promise<PollItem[]> {
  const res = await apiClient.get<PollItem[]>(`/polls/channel/${encodeURIComponent(channelId)}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function resolvePoll(token: string, streamPollId: string): Promise<PollItem> {
  const res = await apiClient.get<PollItem>(`/polls/stream/${encodeURIComponent(streamPollId)}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function updatePoll(token: string, streamPollId: string, payload: UpdatePollPayload): Promise<PollItem> {
  const res = await apiClient.patch<PollItem>(`/polls/stream/${encodeURIComponent(streamPollId)}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function closePoll(token: string, streamPollId: string): Promise<PollItem> {
  const res = await apiClient.post<PollItem>(`/polls/stream/${encodeURIComponent(streamPollId)}/close`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function finalizePoll(token: string, streamPollId: string): Promise<PollItem> {
  const res = await apiClient.post<PollItem>(`/polls/stream/${encodeURIComponent(streamPollId)}/finalize`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
export async function deletePoll(token: string, streamPollId: string): Promise<void> {
  await apiClient.delete(`/polls/stream/${encodeURIComponent(streamPollId)}`, { headers: { Authorization: `Bearer ${token}` } });
}

// --- Conversation AI summaries ---
export type SummaryPeriodType = 'daily' | 'weekly' | 'manual';

export interface ConversationSummaryItem {
  id: string;
  channelId: string;
  periodType: SummaryPeriodType;
  periodStart: string;
  periodEnd: string;
  overview: string;
  keyDecisions: string[];
  actionItems: string[];
  unresolvedTopics: string[];
  messageCount: number;
  provider: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchConversationSummaries(
  token: string,
  channelId: string,
): Promise<ConversationSummaryItem[]> {
  const res = await apiClient.get<ConversationSummaryItem[]>('/chat/summaries', {
    headers: { Authorization: `Bearer ${token}` },
    params: { channelId },
  });
  return res.data;
}

export async function fetchDailySummary(
  token: string,
  channelId: string,
): Promise<ConversationSummaryItem> {
  const res = await apiClient.get<ConversationSummaryItem>('/chat/summaries/daily', {
    headers: { Authorization: `Bearer ${token}` },
    params: { channelId },
  });
  return res.data;
}

export async function fetchWeeklySummary(
  token: string,
  channelId: string,
): Promise<ConversationSummaryItem> {
  const res = await apiClient.get<ConversationSummaryItem>('/chat/summaries/weekly', {
    headers: { Authorization: `Bearer ${token}` },
    params: { channelId },
  });
  return res.data;
}

export async function generateConversationSummary(
  token: string,
  payload: {
    channelId: string;
    periodType: SummaryPeriodType;
    start?: string;
    end?: string;
  },
): Promise<ConversationSummaryItem> {
  const res = await apiClient.post<ConversationSummaryItem>('/chat/summaries/generate', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// --- Smart replies ---
export interface SmartRepliesResponse {
  suggestions: string[];
  provider: string;
}

export async function fetchSmartReplies(
  token: string,
  channelId: string,
): Promise<SmartRepliesResponse> {
  const res = await apiClient.post<SmartRepliesResponse>(
    '/chat/smart-replies',
    { channelId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- Message translation ---
export interface TranslationResponse {
  messageId: string;
  targetLanguage: string;
  sourceLanguage: string | null;
  translatedText: string;
  cached: boolean;
  provider: string;
}

export async function translateMessage(
  token: string,
  payload: { channelId: string; messageId: string; targetLanguage: string },
): Promise<TranslationResponse> {
  const res = await apiClient.post<TranslationResponse>(
    '/chat/translate',
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- AI action detection ---
export type AiDetectedIntent =
  | 'task'
  | 'meeting'
  | 'deadline'
  | 'reminder'
  | 'decision'
  | 'follow_up';

export interface DetectedActionItem {
  id: string;
  channelId: string;
  messageId: string;
  senderId: string | null;
  channelName: string | null;
  intentType: AiDetectedIntent;
  title: string;
  summary: string | null;
  confidence: number | null;
  sourceMessageText: string | null;
  meta: Record<string, unknown> | null;
  status: 'pending' | 'created';
  createdById: string | null;
  resolvedEntityType: string | null;
  resolvedEntityId: string | null;
  resolutionNote: string | null;
  dismissedByMe: boolean;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeMessageActionsResult {
  actions: DetectedActionItem[];
  provider: string;
}

export async function analyzeMessageActions(
  token: string,
  channelId: string,
  messageId?: string,
): Promise<AnalyzeMessageActionsResult> {
  const res = await apiClient.post<AnalyzeMessageActionsResult | DetectedActionItem[]>(
    '/chat/action-detection/analyze',
    { channelId, messageId },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = res.data;
  if (Array.isArray(data)) return { actions: data, provider: 'mock' };
  return data;
}

export async function fetchChannelActions(
  token: string,
  channelId: string,
): Promise<DetectedActionItem[]> {
  const res = await apiClient.get<DetectedActionItem[]>('/chat/action-detection', {
    headers: { Authorization: `Bearer ${token}` },
    params: { channelId },
  });
  return res.data;
}

export async function dismissAction(
  token: string,
  actionId: string,
): Promise<DetectedActionItem> {
  const res = await apiClient.post<DetectedActionItem>(
    `/chat/action-detection/${actionId}/dismiss`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function resolveAction(
  token: string,
  actionId: string,
  payload: { entityType?: string; entityId?: string; note?: string },
): Promise<DetectedActionItem> {
  const res = await apiClient.post<DetectedActionItem>(
    `/chat/action-detection/${actionId}/resolve`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- Creation requests (propose a task/meeting for team-lead approval) ---
export type CreationRequestEntityType = 'task' | 'meeting';
export type CreationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CreationRequestItem {
  id: string;
  entityType: CreationRequestEntityType;
  status: CreationRequestStatus;
  title: string;
  payload: Record<string, unknown>;
  createdById: string;
  sourceChannelId: string | null;
  sourceMessageId: string | null;
  sourceSenderId: string | null;
  sourceChannelName: string | null;
  sourceMessageText: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreationRequestPayload {
  entityType: CreationRequestEntityType;
  payload: TaskPayload | MeetingPayload | Record<string, unknown>;
  sourceChannelId?: string;
  sourceMessageId?: string;
  sourceSenderId?: string;
  sourceChannelName?: string;
  sourceMessageText?: string;
}

export async function createCreationRequest(
  token: string,
  payload: CreateCreationRequestPayload,
): Promise<CreationRequestItem> {
  const res = await apiClient.post<CreationRequestItem>(
    '/creation-requests',
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function fetchCreationRequests(
  token: string,
  entityType?: CreationRequestEntityType,
): Promise<CreationRequestItem[]> {
  const res = await apiClient.get<CreationRequestItem[]>('/creation-requests', {
    headers: { Authorization: `Bearer ${token}` },
    params: entityType ? { entityType } : undefined,
  });
  return res.data;
}

export async function approveCreationRequest(
  token: string,
  requestId: string,
  note?: string,
): Promise<{
  request: CreationRequestItem;
  entity: Record<string, unknown> | null;
}> {
  const res = await apiClient.post<{
    request: CreationRequestItem;
    entity: Record<string, unknown> | null;
  }>(
    `/creation-requests/${requestId}/approve`,
    { note },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function rejectCreationRequest(
  token: string,
  requestId: string,
  note?: string,
): Promise<CreationRequestItem> {
  const res = await apiClient.post<CreationRequestItem>(
    `/creation-requests/${requestId}/reject`,
    { note },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- AI natural-language search ---

export interface AiSearchIntent {
  keywords: string[];
  startDate: string | null;
  endDate: string | null;
  users: string[];
  channels: string[];
  sources: string[];
  intent: string;
}

export interface AiSearchResultItem {
  id: string;
  /** Content scope: chat | tasks | meetings | announcements | projects | milestones | departments. */
  source: string;
  preview: string;
  senderId: string | null;
  senderName: string | null;
  senderImageUrl: string | null;
  channelId: string;
  channelName: string | null;
  createdAt: string;
  /** Deep link into the original conversation. */
  url: string;
  matchedKeywords: string[];
}

export interface AiSearchResponse {
  query: string;
  intent: AiSearchIntent;
  provider: string;
  total: number;
  results: AiSearchResultItem[];
}

export async function searchNaturalLanguage(
  token: string,
  query: string,
): Promise<AiSearchResponse> {
  const res = await apiClient.post<AiSearchResponse>(
    '/search/ai',
    { query },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- AI sentiment analysis (Manager+) ---

export type SentimentCategory = 'positive' | 'frustration' | 'blocker' | 'neutral';

export interface SentimentInsight {
  messageId: string;
  userId: string | null;
  userName: string | null;
  text: string;
  createdAt: string | null;
  category: SentimentCategory;
  confidence: number;
  /** Deep link into the original conversation. */
  url: string;
}

export interface SentimentTrendPoint {
  date: string;
  positive: number;
  frustration: number;
  neutral: number;
}

export interface SentimentAnalysisResponse {
  project: { id: string; name: string; channelId: string | null };
  enabled: boolean;
  insufficient: boolean;
  analyzedCount: number;
  provider: string;
  overall: { label: string; score: number } | null;
  positives: SentimentInsight[];
  frustrations: SentimentInsight[];
  blockers: SentimentInsight[];
  trend: SentimentTrendPoint[];
}

export async function fetchSentimentStatus(
  token: string,
): Promise<{ enabled: boolean }> {
  const res = await apiClient.get<{ enabled: boolean }>('/sentiment/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function setSentimentStatus(
  token: string,
  enabled: boolean,
): Promise<{ enabled: boolean }> {
  const res = await apiClient.put<{ enabled: boolean }>(
    '/sentiment/status',
    { enabled },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function analyzeSentiment(
  token: string,
  projectId: string,
  days = 14,
): Promise<SentimentAnalysisResponse> {
  const res = await apiClient.post<SentimentAnalysisResponse>(
    '/sentiment/analyze',
    { projectId, days },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- Moderation (reports queue, actions, logs) ---

export type ModerationActionType =
  | 'message_delete'
  | 'user_mute'
  | 'user_unmute'
  | 'member_remove'
  | 'user_ban'
  | 'user_unban'
  | 'channel_lock'
  | 'channel_unlock'
  | 'report_review'
  | 'report_resolve'
  | 'report_dismiss';

export type ModerationReportStatus =
  | 'pending'
  | 'reviewing'
  | 'resolved'
  | 'dismissed';

export interface ModerationReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'message' | 'user';
  targetMessageId: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  targetMessageText: string | null;
  channelId: string;
  channelName: string | null;
  reason: string;
  description: string | null;
  status: ModerationReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface ModerationReportList {
  items: ModerationReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModerationLogItem {
  id: string;
  moderatorId: string;
  moderatorName: string;
  moderatorRole: UserRole;
  actionType: ModerationActionType;
  targetUserId: string | null;
  targetMessageId: string | null;
  channelId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ModerationLogList {
  items: ModerationLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchModerationReports(
  token: string,
  params: {
    page?: number;
    limit?: number;
    status?: ModerationReportStatus;
  } = {},
): Promise<ModerationReportList> {
  const res = await apiClient.get<ModerationReportList>('/moderation/reports', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
}

export async function updateModerationReport(
  token: string,
  reportId: string,
  payload: { action: 'review' | 'resolve' | 'dismiss'; note?: string },
): Promise<ModerationReportItem> {
  const res = await apiClient.patch<ModerationReportItem>(
    `/moderation/reports/${reportId}`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function fetchModerationLogs(
  token: string,
  params: {
    page?: number;
    limit?: number;
    actionType?: ModerationActionType;
  } = {},
): Promise<ModerationLogList> {
  const res = await apiClient.get<ModerationLogList>('/moderation/logs', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
}

export async function deleteModerationMessage(
  token: string,
  messageId: string,
  reason?: string,
): Promise<{ id: string; deleted: boolean }> {
  const res = await apiClient.post<{ id: string; deleted: boolean }>(
    `/moderation/messages/${messageId}/delete`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function muteModerationUser(
  token: string,
  payload: {
    channelId: string;
    targetUserId: string;
    durationMinutes?: number;
    reason?: string;
  },
): Promise<{ muted: boolean; targetUserId: string; channelId: string }> {
  const res = await apiClient.post('/moderation/users/mute', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function unmuteModerationUser(
  token: string,
  payload: { channelId: string; targetUserId: string; reason?: string },
): Promise<{ muted: boolean; targetUserId: string; channelId: string }> {
  const res = await apiClient.post('/moderation/users/unmute', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function removeModerationMember(
  token: string,
  payload: { channelId: string; targetUserId: string; reason?: string },
): Promise<{ removed: boolean; targetUserId: string }> {
  const res = await apiClient.post('/moderation/users/remove', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function banModerationUser(
  token: string,
  payload: {
    channelId?: string;
    targetUserId: string;
    timeoutMinutes?: number;
    reason?: string;
  },
): Promise<{ banned: boolean; targetUserId: string }> {
  const res = await apiClient.post('/moderation/users/ban', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function unbanModerationUser(
  token: string,
  payload: { channelId?: string; targetUserId: string; reason?: string },
): Promise<{ banned: boolean; targetUserId: string }> {
  const res = await apiClient.post('/moderation/users/unban', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function setChannelLock(
  token: string,
  payload: { channelId: string; locked: boolean; reason?: string },
): Promise<{ channelId: string; locked: boolean }> {
  const res = await apiClient.post('/moderation/channels/lock', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function createModerationReport(
  token: string,
  payload: {
    targetType: 'message' | 'user';
    targetMessageId?: string;
    targetUserId?: string;
    channelId: string;
    channelName?: string;
    reason: string;
    description?: string;
  },
): Promise<ModerationReportItem> {
  const res = await apiClient.post<ModerationReportItem>(
    '/moderation/reports',
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

// --- Admin analytics (Manager+) ---

export type AnalyticsScope = 'platform' | 'managed';

export interface AnalyticsKpi {
  value: number;
  previous: number | null;
  changePct: number | null;
  unit?: string;
}

export interface AnalyticsRangeInfo {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  days: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  messages: number;
  activeUsers: number;
}

export interface AnalyticsTeamActivityPoint {
  channelId: string;
  name: string;
  kind: string;
  messageCount: number;
  activeUsers: number;
  memberCount: number;
}

export interface AnalyticsAiUsagePoint {
  date: string;
  total: number;
  summaries: number;
  translations: number;
  actions: number;
}

export interface AnalyticsStoragePoint {
  date: string;
  bytes: number;
  documents: number;
}

export interface AnalyticsModerationPoint {
  date: string;
  reports: number;
  actions: number;
}

export interface AnalyticsFilterOptions {
  teams: { id: string; name: string; kind: string; channelId: string }[];
  departments: { id: string; name: string; channelId: string | null }[];
  channels: { id: string; name: string; kind: string }[];
}

export interface AnalyticsOverview {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  truncated: boolean;
  kpis: {
    totalMessages: AnalyticsKpi;
    activeUsers: AnalyticsKpi;
    activeChannels: AnalyticsKpi;
    averageResponseTime: AnalyticsKpi;
    mostActiveTeams: AnalyticsTeamActivityPoint[];
    storageUsage: AnalyticsKpi;
    aiUsage: AnalyticsKpi;
    pendingReports: AnalyticsKpi;
    moderationActivity: AnalyticsKpi;
  };
  charts: {
    messageActivity: AnalyticsDailyPoint[];
    teamActivity: AnalyticsTeamActivityPoint[];
    storageUsage: AnalyticsStoragePoint[];
    aiUsage: AnalyticsAiUsagePoint[];
    moderation: AnalyticsModerationPoint[];
  };
  filters: AnalyticsFilterOptions;
}

export interface AnalyticsTopSender {
  userId: string;
  name: string;
  imageUrl: string | null;
  messageCount: number;
}

export interface AnalyticsMessagesDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  truncated: boolean;
  total: number;
  daily: AnalyticsDailyPoint[];
  topSenders: AnalyticsTopSender[];
  byChannel: {
    channelId: string;
    name: string;
    kind: string;
    messageCount: number;
    activeUsers: number;
  }[];
}

export interface AnalyticsActiveUserDetail {
  userId: string;
  name: string;
  imageUrl: string | null;
  messageCount: number;
  online: boolean;
  lastActive: string | null;
}

export interface AnalyticsUsersDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  truncated: boolean;
  totalActive: number;
  totalRegistered: number;
  daily: AnalyticsDailyPoint[];
  active: AnalyticsActiveUserDetail[];
}

export interface AnalyticsChannelsDetailItem {
  channelId: string;
  name: string;
  kind: string;
  messageCount: number;
  memberCount: number;
  activeUsers: number;
  createdBy: string;
  lastMessageAt: string | null;
}

export interface AnalyticsChannelsDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  truncated: boolean;
  items: AnalyticsChannelsDetailItem[];
  total: number;
}

export interface AnalyticsTeamsDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  truncated: boolean;
  items: AnalyticsTeamActivityPoint[];
}

export interface AnalyticsStorageDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  totalBytes: number;
  totalDocuments: number;
  byProject: { projectId: string; name: string; bytes: number; documents: number }[];
  byMime: { mimeType: string; bytes: number; documents: number }[];
  daily: AnalyticsStoragePoint[];
}

export interface AnalyticsAiDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  total: number;
  byFeature: { feature: string; count: number; changePct: number | null }[];
  byIntent: { intentType: string; count: number }[];
  byProvider: { provider: string; count: number }[];
  daily: AnalyticsAiUsagePoint[];
}

export interface AnalyticsModerationDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  pendingReports: number;
  reportsByStatus: { status: string; count: number }[];
  totalActions: number;
  actionsByType: { actionType: string; count: number }[];
  daily: AnalyticsModerationPoint[];
  recentActions: {
    id: string;
    moderatorId: string;
    moderatorName: string;
    actionType: string;
    targetUserId: string | null;
    channelId: string | null;
    createdAt: string;
  }[];
}

export interface AnalyticsResponseTimeDetail {
  scope: AnalyticsScope;
  range: AnalyticsRangeInfo;
  generatedAt: string;
  averageSeconds: number | null;
  samples: number;
  byChannel: {
    channelId: string;
    name: string;
    averageSeconds: number | null;
    samples: number;
  }[];
}

export type AnalyticsQueryParams = {
  range?: string;
  startDate?: string;
  endDate?: string;
  teamId?: string;
  departmentId?: string;
  channelId?: string;
};

export type AnalyticsDetailParams = AnalyticsQueryParams & {
  limit?: number;
  offset?: number;
};

async function analyticsGet<T>(
  token: string,
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await apiClient.get<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
}

export async function fetchAnalyticsOverview(
  token: string,
  params: AnalyticsQueryParams = {},
): Promise<AnalyticsOverview> {
  return analyticsGet<AnalyticsOverview>(token, '/analytics/overview', params);
}

export async function fetchAnalyticsMessages(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsMessagesDetail> {
  return analyticsGet<AnalyticsMessagesDetail>(token, '/analytics/messages', params);
}

export async function fetchAnalyticsUsers(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsUsersDetail> {
  return analyticsGet<AnalyticsUsersDetail>(token, '/analytics/users', params);
}

export async function fetchAnalyticsChannels(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsChannelsDetail> {
  return analyticsGet<AnalyticsChannelsDetail>(token, '/analytics/channels', params);
}

export async function fetchAnalyticsTeams(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsTeamsDetail> {
  return analyticsGet<AnalyticsTeamsDetail>(token, '/analytics/teams', params);
}

export async function fetchAnalyticsStorage(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsStorageDetail> {
  return analyticsGet<AnalyticsStorageDetail>(token, '/analytics/storage', params);
}

export async function fetchAnalyticsAi(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsAiDetail> {
  return analyticsGet<AnalyticsAiDetail>(token, '/analytics/ai', params);
}

export async function fetchAnalyticsModeration(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsModerationDetail> {
  return analyticsGet<AnalyticsModerationDetail>(token, '/analytics/moderation', params);
}

export async function fetchAnalyticsResponseTime(
  token: string,
  params: AnalyticsDetailParams = {},
): Promise<AnalyticsResponseTimeDetail> {
  return analyticsGet<AnalyticsResponseTimeDetail>(token, '/analytics/response-time', params);
}

// --- Audit & compliance (Admin+) ---

export type AuditActionType =
  | 'message_edit'
  | 'message_delete'
  | 'user_join'
  | 'user_leave'
  | 'member_remove'
  | 'role_change'
  | 'channel_create'
  | 'channel_delete'
  | 'moderator_action'
  | 'user_mute'
  | 'user_unmute'
  | 'user_ban'
  | 'user_unban'
  | 'channel_lock'
  | 'channel_unlock'
  | 'workflow_create'
  | 'workflow_update'
  | 'workflow_delete'
  | 'workflow_toggle'
  | 'workflow_execution';

export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  message_edit: 'Message edited',
  message_delete: 'Message deleted',
  user_join: 'User joined',
  user_leave: 'User left',
  member_remove: 'Member removed',
  role_change: 'Role changed',
  channel_create: 'Channel created',
  channel_delete: 'Channel deleted',
  moderator_action: 'Moderator action',
  user_mute: 'User muted',
  user_unmute: 'User unmuted',
  user_ban: 'User banned',
  user_unban: 'User unbanned',
  channel_lock: 'Channel locked',
  channel_unlock: 'Channel unlocked',
  workflow_create: 'Workflow created',
  workflow_update: 'Workflow updated',
  workflow_delete: 'Workflow deleted',
  workflow_toggle: 'Workflow toggled',
  workflow_execution: 'Workflow execution',
};

export type AuditResourceType =
  | 'message'
  | 'user'
  | 'channel'
  | 'project'
  | 'department'
  | 'workflow';

export interface AuditEventItem {
  id: string;
  actionType: AuditActionType;
  actorId: string;
  actorRole: UserRole;
  actorName: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  resourceType: AuditResourceType;
  resourceId: string | null;
  resourceName: string | null;
  channelId: string | null;
  projectId: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditEventList {
  items: AuditEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchAuditLogsParams {
  page?: number;
  limit?: number;
  actionType?: AuditActionType;
  actorId?: string;
  channelId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: 'newest' | 'oldest';
}

export async function fetchAuditLogs(
  token: string,
  params: FetchAuditLogsParams = {},
): Promise<AuditEventList> {
  const res = await apiClient.get<AuditEventList>('/audit/logs', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
}

export async function fetchAuditActionTypes(
  token: string,
): Promise<AuditActionType[]> {
  const res = await apiClient.get<{ items: AuditActionType[] }>('/audit/actions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.items;
}

// --- Chat message edit / delete (audited through the backend) ---

export async function editChatMessage(
  token: string,
  messageId: string,
  text: string,
): Promise<{ id: string; updated: boolean }> {
  const res = await apiClient.post<{ id: string; updated: boolean }>(
    `/chat/messages/${encodeURIComponent(messageId)}/edit`,
    { text },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}

export async function deleteChatMessage(
  token: string,
  messageId: string,
): Promise<{ id: string; deleted: boolean }> {
  const res = await apiClient.post<{ id: string; deleted: boolean }>(
    `/chat/messages/${encodeURIComponent(messageId)}/delete`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data;
}
