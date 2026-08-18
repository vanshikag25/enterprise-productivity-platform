import type { AuthObject } from '../auth/auth-object';
import { UsersService } from '../users/users.service';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { MuteUserDto } from './dto/mute-user.dto';
import { UserTargetDto } from './dto/user-target.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { LockChannelDto } from './dto/lock-channel.dto';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { ListLogsQueryDto } from './dto/list-logs-query.dto';
export declare class ModerationController {
    private readonly moderationService;
    private readonly usersService;
    constructor(moderationService: ModerationService, usersService: UsersService);
    createReport(auth: AuthObject, dto: CreateReportDto): Promise<{
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
    listReports(auth: AuthObject, query: ListReportsQueryDto): Promise<{
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
    updateReport(auth: AuthObject, id: string, dto: UpdateReportDto): Promise<{
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
    deleteMessage(auth: AuthObject, messageId: string, body: {
        reason?: string;
    }): Promise<{
        id: string;
        deleted: boolean;
    }>;
    muteUser(auth: AuthObject, dto: MuteUserDto): Promise<{
        muted: boolean;
        targetUserId: string;
        channelId: string;
    }>;
    unmuteUser(auth: AuthObject, dto: UserTargetDto): Promise<{
        muted: boolean;
        targetUserId: string;
        channelId: string;
    }>;
    removeMember(auth: AuthObject, dto: UserTargetDto): Promise<{
        removed: boolean;
        targetUserId: string;
    }>;
    banUser(auth: AuthObject, dto: BanUserDto): Promise<{
        banned: boolean;
        targetUserId: string;
    }>;
    unbanUser(auth: AuthObject, dto: BanUserDto): Promise<{
        banned: boolean;
        targetUserId: string;
    }>;
    lockChannel(auth: AuthObject, dto: LockChannelDto): Promise<{
        channelId: string;
        locked: boolean;
    }>;
    listLogs(auth: AuthObject, query: ListLogsQueryDto): Promise<{
        items: {
            id: string;
            moderatorId: string;
            moderatorName: string;
            moderatorRole: "super_admin" | "organization_owner" | "admin" | "manager" | "team_lead" | "employee" | "guest";
            actionType: "message_delete" | "member_remove" | "user_mute" | "user_unmute" | "user_ban" | "user_unban" | "channel_lock" | "channel_unlock" | "report_review" | "report_resolve" | "report_dismiss";
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
    private requireActor;
}
