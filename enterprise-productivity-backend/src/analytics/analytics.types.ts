export type AnalyticsScope = 'platform' | 'managed';

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  days: number;
}

export interface AnalyticsKpi {
  value: number;
  previous: number | null;
  changePct: number | null;
  unit?: string;
}

export interface MostActiveTeam {
  channelId: string;
  name: string;
  kind: string;
  teamId: string | null;
  messageCount: number;
  activeUsers: number;
  memberCount: number;
}

export interface DailyPoint {
  date: string;
  messages: number;
  activeUsers: number;
}

export interface TeamActivityPoint {
  channelId: string;
  name: string;
  kind: string;
  messageCount: number;
  activeUsers: number;
  memberCount: number;
}

export interface AiUsagePoint {
  date: string;
  total: number;
  summaries: number;
  translations: number;
  actions: number;
}

export interface StoragePoint {
  date: string;
  bytes: number;
  documents: number;
}

export interface ModerationPoint {
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
  range: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
    days: number;
  };
  generatedAt: string;
  truncated: boolean;
  kpis: {
    totalMessages: AnalyticsKpi;
    activeUsers: AnalyticsKpi;
    activeChannels: AnalyticsKpi;
    averageResponseTime: AnalyticsKpi;
    mostActiveTeams: MostActiveTeam[];
    storageUsage: AnalyticsKpi;
    aiUsage: AnalyticsKpi;
    pendingReports: AnalyticsKpi;
    moderationActivity: AnalyticsKpi;
  };
  charts: {
    messageActivity: DailyPoint[];
    teamActivity: TeamActivityPoint[];
    storageUsage: StoragePoint[];
    aiUsage: AiUsagePoint[];
    moderation: ModerationPoint[];
  };
  filters: AnalyticsFilterOptions;
}

export interface TopSender {
  userId: string;
  name: string;
  imageUrl: string | null;
  messageCount: number;
}

export interface MessagesDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  truncated: boolean;
  total: number;
  daily: DailyPoint[];
  topSenders: TopSender[];
  byChannel: {
    channelId: string;
    name: string;
    kind: string;
    messageCount: number;
    activeUsers: number;
  }[];
}

export interface ActiveUserDetail {
  userId: string;
  name: string;
  imageUrl: string | null;
  messageCount: number;
  online: boolean;
  lastActive: string | null;
}

export interface UsersDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  truncated: boolean;
  totalActive: number;
  totalRegistered: number;
  daily: DailyPoint[];
  active: ActiveUserDetail[];
}

export interface ChannelsDetailItem {
  channelId: string;
  name: string;
  kind: string;
  messageCount: number;
  memberCount: number;
  activeUsers: number;
  createdBy: string;
  lastMessageAt: string | null;
}

export interface ChannelsDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  truncated: boolean;
  items: ChannelsDetailItem[];
  total: number;
}

export interface TeamsDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  truncated: boolean;
  items: MostActiveTeam[];
}

export interface StorageByProject {
  projectId: string;
  name: string;
  bytes: number;
  documents: number;
}

export interface StorageDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  totalBytes: number;
  totalDocuments: number;
  byProject: StorageByProject[];
  byMime: { mimeType: string; bytes: number; documents: number }[];
  daily: StoragePoint[];
}

export interface AiByFeature {
  feature: string;
  count: number;
  changePct: number | null;
}

export interface AiDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  total: number;
  byFeature: AiByFeature[];
  byIntent: { intentType: string; count: number }[];
  byProvider: { provider: string; count: number }[];
  daily: AiUsagePoint[];
}

export interface ModerationDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  pendingReports: number;
  reportsByStatus: { status: string; count: number }[];
  totalActions: number;
  actionsByType: { actionType: string; count: number }[];
  daily: ModerationPoint[];
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

export interface ResponseTimeByChannel {
  channelId: string;
  name: string;
  averageSeconds: number | null;
  samples: number;
}

export interface ResponseTimeDetail {
  scope: AnalyticsScope;
  range: AnalyticsOverview['range'];
  generatedAt: string;
  averageSeconds: number | null;
  samples: number;
  byChannel: ResponseTimeByChannel[];
}
