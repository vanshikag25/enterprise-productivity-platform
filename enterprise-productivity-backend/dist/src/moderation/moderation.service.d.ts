import { OnModuleInit } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type ModerationReportStatus } from '../database/schema/moderation.schema';
import { type User } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { Channel as StreamChannel } from 'stream-chat';
export type ModerationScope = 'platform' | 'managed' | 'none';
export interface ListReportsParams {
    page: number;
    limit: number;
    status?: ModerationReportStatus;
}
export interface ListLogsParams {
    page: number;
    limit: number;
    actionType?: string;
}
export declare class ModerationService implements OnModuleInit {
    private readonly db;
    private readonly streamService;
    private readonly usersService;
    private readonly projectAccess;
    private readonly notificationsService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, usersService: UsersService, projectAccess: ProjectAccessService, notificationsService: NotificationsService);
    onModuleInit(): Promise<void>;
    private ensureChannelModeratorsCanUseFrozenChannels;
    private platformRole;
    private watchChannel;
    private memberIsModerator;
    private moderationApi;
    channelScope(channel: StreamChannel, actor: User): Promise<ModerationScope>;
    private assertCanModerateChannel;
    private requireTargetUser;
    private assertNotSelf;
    private assertTargetRankBelow;
    private assertCanBan;
    private log;
    private managedChannelIds;
    deleteMessage(actor: User, messageId: string, reason?: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    muteUser(actor: User, dto: {
        channelId: string;
        targetUserId: string;
        durationMinutes?: number;
        reason?: string;
    }): Promise<{
        muted: boolean;
        targetUserId: string;
        channelId: string;
    }>;
    unmuteUser(actor: User, dto: {
        channelId: string;
        targetUserId: string;
        reason?: string;
    }): Promise<{
        muted: boolean;
        targetUserId: string;
        channelId: string;
    }>;
    removeMember(actor: User, dto: {
        channelId: string;
        targetUserId: string;
        reason?: string;
    }): Promise<{
        removed: boolean;
        targetUserId: string;
    }>;
    banUser(actor: User, dto: {
        targetUserId: string;
        channelId?: string;
        timeoutMinutes?: number;
        reason?: string;
    }): Promise<{
        banned: boolean;
        targetUserId: string;
    }>;
    unbanUser(actor: User, dto: {
        targetUserId: string;
        channelId?: string;
        reason?: string;
    }): Promise<{
        banned: boolean;
        targetUserId: string;
    }>;
    setChannelLock(actor: User, dto: {
        channelId: string;
        locked: boolean;
        reason?: string;
    }): Promise<{
        channelId: string;
        locked: boolean;
    }>;
    createReport(actor: User, dto: {
        targetType: 'message' | 'user';
        targetMessageId?: string;
        targetUserId?: string;
        channelId: string;
        channelName?: string;
        reason: string;
        description?: string;
    }): Promise<{
        id: string;
        reporterId: string;
        reporterName: string;
        targetType: string;
        targetMessageId: string | null;
        targetUserId: string | null;
        targetUserName: string | null;
        targetMessageText: string | null;
        channelId: string;
        channelName: string | null;
        reason: string;
        description: string | null;
        status: string;
        reviewedBy: string | null;
        reviewedAt: string | null;
        resolutionNote: string | null;
        createdAt: string;
    }>;
    private serializeReport;
    listReports(actor: User, params: ListReportsParams): Promise<{
        items: {
            id: string;
            reporterId: string;
            reporterName: string;
            targetType: string;
            targetMessageId: string | null;
            targetUserId: string | null;
            targetUserName: string | null;
            targetMessageText: string | null;
            channelId: string;
            channelName: string | null;
            reason: string;
            description: string | null;
            status: string;
            reviewedBy: string | null;
            reviewedAt: string | null;
            resolutionNote: string | null;
            createdAt: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateReport(actor: User, reportId: string, action: 'review' | 'resolve' | 'dismiss', note?: string): Promise<{
        id: string;
        reporterId: string;
        reporterName: string;
        targetType: string;
        targetMessageId: string | null;
        targetUserId: string | null;
        targetUserName: string | null;
        targetMessageText: string | null;
        channelId: string;
        channelName: string | null;
        reason: string;
        description: string | null;
        status: string;
        reviewedBy: string | null;
        reviewedAt: string | null;
        resolutionNote: string | null;
        createdAt: string;
    }>;
    listLogs(actor: User, params: ListLogsParams): Promise<{
        items: {
            id: string;
            moderatorId: string;
            moderatorName: string;
            moderatorRole: "super_admin" | "organization_owner" | "admin" | "manager" | "team_lead" | "employee" | "guest";
            actionType: "message_delete" | "user_mute" | "user_unmute" | "member_remove" | "user_ban" | "user_unban" | "channel_lock" | "channel_unlock" | "report_review" | "report_resolve" | "report_dismiss";
            targetUserId: string | null;
            targetMessageId: string | null;
            channelId: string | null;
            reason: string | null;
            createdAt: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
