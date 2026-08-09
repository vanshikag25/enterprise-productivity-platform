import axios from 'axios';

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

export interface UserDirectoryItem {
  id: string; name: string; email: string; imageUrl: string | null;
  online: boolean; lastSeen: string | null; department?: string; organization?: string; joinedAt: string; role: UserRole;
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
  payload: { firstName?: string; lastName?: string; imageUrl?: string },
): Promise<MeResponse> {
  const res = await apiClient.patch<MeResponse>('/users/me', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
  scheduledDate: string; startTime: string; endTime: string;
  organizerId: string; participants: string[]; meetingStatus: string;
  meetingChatChannelId: string | null; createdAt: string; updatedAt: string;
}
export interface MeetingPayload {
  title: string; description?: string; scheduledDate: string;
  startTime: string; endTime: string; participants: string[];
  sourceChannelId?: string; sourceMessageId?: string;
  sourceSenderId?: string; sourceChannelName?: string;
}

export async function fetchMeetings(token: string): Promise<MeetingItem[]> {
  const res = await apiClient.get<MeetingItem[]>('/meetings', { headers: { Authorization: `Bearer ${token}` } });
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
// --- Channels / Departments ---
export interface ChannelSummary {
  id: string; name: string; description: string; kind: string;
  departmentId: string | null; createdBy: string; createdAt: string; memberCount: number; frozen: boolean;
}
export interface DepartmentItem {
  id: string; name: string; description: string | null; memberIds: string[]; channelId: string | null; createdBy: string; createdAt: string;
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
export async function createDepartment(token: string, payload: { name: string; description?: string; memberIds?: string[] }): Promise<DepartmentItem> {
  const res = await apiClient.post<DepartmentItem>('/departments', payload, { headers: { Authorization: `Bearer ${token}` } });
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
