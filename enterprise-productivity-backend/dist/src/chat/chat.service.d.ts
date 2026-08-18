import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';
import { AuditService } from '../audit/audit.service';
export type GroupRole = 'owner' | 'moderator' | 'member' | 'admin';
export type MemberRole = Exclude<GroupRole, 'admin'>;
export interface GroupMemberInfo {
    id: string;
    name: string | null;
    imageUrl: string | null;
    role: MemberRole;
}
export interface GroupInfo {
    channelId: string;
    name: string | null;
    description: string | null;
    avatarUrl: string | null;
    memberCount: number;
    createdById: string;
    currentUserRole: GroupRole;
    canManage: boolean;
    canManageModerators: boolean;
    members: GroupMemberInfo[];
}
interface UpdateGroupInput {
    name?: string;
    description?: string;
}
export declare class ChatService {
    private readonly db;
    private readonly streamService;
    private readonly usersService;
    private readonly notificationsService;
    private readonly moderationService;
    private readonly auditService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService, usersService: UsersService, notificationsService: NotificationsService, moderationService: ModerationService, auditService: AuditService);
    private watchChannel;
    private loadActor;
    private audit;
    private memberRole;
    private resolveRole;
    private assertCanManage;
    private assertCanManageModerators;
    private toGroupInfo;
    getGroupInfo(channelId: string, userId: string): Promise<GroupInfo>;
    updateGroup(channelId: string, userId: string, changes: UpdateGroupInput): Promise<GroupInfo>;
    updateGroupAvatar(channelId: string, userId: string, avatarUrl: string): Promise<GroupInfo>;
    removeGroupAvatar(channelId: string, userId: string): Promise<GroupInfo>;
    addMember(channelId: string, userId: string, memberId: string): Promise<GroupInfo>;
    removeMember(channelId: string, userId: string, memberId: string): Promise<GroupInfo>;
    leaveGroup(channelId: string, userId: string): Promise<void>;
    assignModerator(channelId: string, userId: string, memberId: string): Promise<GroupInfo>;
    demoteModerator(channelId: string, userId: string, memberId: string): Promise<GroupInfo>;
    private channelIdOf;
    editMessage(userId: string, messageId: string, text: string): Promise<{
        id: string;
        updated: boolean;
    }>;
    deleteMessage(userId: string, messageId: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
export {};
