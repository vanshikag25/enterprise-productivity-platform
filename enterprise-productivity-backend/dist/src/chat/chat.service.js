"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const chat_channels_schema_1 = require("../database/schema/chat-channels.schema");
const stream_service_1 = require("../stream/stream.service");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const moderation_service_1 = require("../moderation/moderation.service");
const audit_service_1 = require("../audit/audit.service");
const roles_1 = require("../rbac/roles");
let ChatService = ChatService_1 = class ChatService {
    constructor(db, streamService, usersService, notificationsService, moderationService, auditService) {
        this.db = db;
        this.streamService = streamService;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
        this.moderationService = moderationService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async watchChannel(channelId) {
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        await channel.watch();
        return channel;
    }
    async loadActor(userId) {
        const user = await this.usersService.findByUsername(userId);
        if (!user) {
            throw new common_1.NotFoundException('User profile not found.');
        }
        return user;
    }
    async audit(actionType, actor, fields) {
        await this.auditService.record({
            actionType,
            actorId: actor.username,
            actorRole: actor.role,
            actorName: `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() ||
                actor.username,
            targetUserId: fields.targetUserId ?? null,
            targetUserName: fields.targetUserName ?? null,
            resourceType: fields.resourceType ?? 'channel',
            resourceId: fields.resourceId ?? null,
            resourceName: fields.resourceName ?? null,
            channelId: fields.channelId ?? null,
            projectId: fields.projectId ?? null,
            previousValue: fields.previousValue ?? null,
            newValue: fields.newValue ?? null,
            reason: fields.reason ?? null,
        });
    }
    memberRole(member, createdById) {
        if (member.user?.id && member.user.id === createdById)
            return 'owner';
        if (member.is_moderator ||
            member.channel_role === 'channel_moderator' ||
            member.channel_role === 'moderator') {
            return 'moderator';
        }
        return 'member';
    }
    async resolveRole(channel, userId) {
        const data = (channel.data ?? {});
        if (userId === data.created_by_id)
            return 'owner';
        const member = (channel.state.members ?? {})[userId];
        if (member) {
            const role = this.memberRole(member, data.created_by_id);
            if (role === 'moderator')
                return 'moderator';
        }
        const user = await this.usersService.findByUsername(userId);
        if (user && (0, roles_1.hasMinRole)(user.role, 'manager'))
            return 'admin';
        return 'member';
    }
    assertCanManage(role) {
        if (role !== 'owner' && role !== 'admin' && role !== 'moderator') {
            throw new common_1.ForbiddenException('Only the group creator, a moderator, or an admin can manage this group.');
        }
    }
    assertCanManageModerators(role) {
        if (role !== 'owner' && role !== 'admin') {
            throw new common_1.ForbiddenException('Only the group creator or an admin can assign moderators.');
        }
    }
    async toGroupInfo(channel, channelId, role) {
        const data = (channel.data ?? {});
        const createdById = data.created_by_id ?? '';
        const members = Object.values(channel.state.members ?? {}).map((m) => {
            const member = m;
            return {
                id: member.user?.id ?? '',
                name: member.user?.name ?? null,
                imageUrl: member.user?.image ?? null,
                role: this.memberRole(member, createdById),
            };
        });
        const avatarRow = await this.db
            .select()
            .from(chat_channels_schema_1.chatChannelAvatars)
            .where((0, drizzle_orm_1.eq)(chat_channels_schema_1.chatChannelAvatars.channelId, channelId))
            .limit(1);
        return {
            channelId: channel.id ?? channelId,
            name: data.name ?? null,
            description: data.description ?? null,
            avatarUrl: avatarRow[0]?.avatarUrl ?? null,
            memberCount: members.length,
            createdById,
            currentUserRole: role,
            canManage: role === 'owner' || role === 'admin' || role === 'moderator',
            canManageModerators: role === 'owner' || role === 'admin',
            members,
        };
    }
    async getGroupInfo(channelId, userId) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        return this.toGroupInfo(channel, channelId, role);
    }
    async updateGroup(channelId, userId, changes) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManage(role);
        const set = {};
        if (changes.name !== undefined)
            set.name = changes.name;
        if (changes.description !== undefined)
            set.description = changes.description;
        if (Object.keys(set).length === 0) {
            throw new common_1.BadRequestException('Nothing to update.');
        }
        await channel.updatePartial({ set });
        return this.getGroupInfo(channelId, userId);
    }
    async updateGroupAvatar(channelId, userId, avatarUrl) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManage(role);
        await this.db
            .insert(chat_channels_schema_1.chatChannelAvatars)
            .values({ channelId, avatarUrl, updatedAt: new Date() })
            .onConflictDoUpdate({
            target: chat_channels_schema_1.chatChannelAvatars.channelId,
            set: { avatarUrl, updatedAt: new Date() },
        });
        await channel.updatePartial({
            set: { image: avatarUrl },
        });
        this.logger.log(`Group avatar updated: ${channelId}`);
        return this.getGroupInfo(channelId, userId);
    }
    async removeGroupAvatar(channelId, userId) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManage(role);
        await this.db
            .delete(chat_channels_schema_1.chatChannelAvatars)
            .where((0, drizzle_orm_1.eq)(chat_channels_schema_1.chatChannelAvatars.channelId, channelId));
        await channel.updatePartial({
            set: { image: '' },
        });
        this.logger.log(`Group avatar removed: ${channelId}`);
        return this.getGroupInfo(channelId, userId);
    }
    async addMember(channelId, userId, memberId) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManage(role);
        if ((channel.state.members ?? {})[memberId]) {
            throw new common_1.BadRequestException('User is already a member of this group.');
        }
        await channel.addMembers([memberId]);
        const data = (channel.data ?? {});
        await this.notificationsService.create({
            userId: memberId,
            type: 'added_to_group',
            title: 'Added to group',
            description: data.name ?? 'a group',
            actionUrl: `/dashboard?channel=${channelId}`,
        });
        await this.audit('user_join', await this.loadActor(userId), {
            targetUserId: memberId,
            targetUserName: (channel.state.members ?? {})[memberId]?.user?.name ?? null,
            resourceType: 'channel',
            resourceId: channelId,
            resourceName: data.name ?? null,
            channelId,
        });
        return this.getGroupInfo(channelId, userId);
    }
    async removeMember(channelId, userId, memberId) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManage(role);
        const data = (channel.data ?? {});
        if (data.created_by_id === memberId) {
            throw new common_1.BadRequestException('The group creator cannot be removed.');
        }
        if (userId === memberId) {
            throw new common_1.BadRequestException('You cannot remove yourself from the group.');
        }
        const targetMember = (channel.state.members ?? {})[memberId];
        if (!targetMember) {
            throw new common_1.BadRequestException('User is not a member of this group.');
        }
        if (this.memberRole(targetMember, data.created_by_id) ===
            'moderator' &&
            role !== 'owner' &&
            role !== 'admin') {
            throw new common_1.ForbiddenException('Only the group creator or an admin can remove a moderator.');
        }
        await channel.removeMembers([memberId]);
        await this.notificationsService.create({
            userId: memberId,
            type: 'removed_from_group',
            title: 'Removed from group',
            description: data.name ?? 'a group',
        });
        await this.audit('member_remove', await this.loadActor(userId), {
            targetUserId: memberId,
            targetUserName: targetMember.user?.name ?? null,
            resourceType: 'channel',
            resourceId: channelId,
            resourceName: data.name ?? null,
            channelId,
        });
        return this.getGroupInfo(channelId, userId);
    }
    async leaveGroup(channelId, userId) {
        const channel = await this.watchChannel(channelId);
        const data = (channel.data ?? {});
        if (data.created_by_id === userId) {
            throw new common_1.BadRequestException('The group creator cannot leave the group. Delete it or transfer ownership instead.');
        }
        await channel.removeMembers([userId]);
        this.logger.log(`User ${userId} left group ${channelId}`);
        await this.audit('user_leave', await this.loadActor(userId), {
            targetUserId: userId,
            resourceType: 'channel',
            resourceId: channelId,
            resourceName: data.name ?? null,
            channelId,
        });
    }
    async assignModerator(channelId, userId, memberId) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManageModerators(role);
        if (!(channel.state.members ?? {})[memberId]) {
            throw new common_1.BadRequestException('User is not a member of this group.');
        }
        await channel.addModerators([memberId]);
        this.logger.log(`Moderator assigned: ${memberId} in ${channelId}`);
        const data = (channel.data ?? {});
        await this.audit('moderator_action', await this.loadActor(userId), {
            targetUserId: memberId,
            targetUserName: (channel.state.members ?? {})[memberId]?.user?.name ?? null,
            resourceType: 'channel',
            resourceId: channelId,
            resourceName: data.name ?? null,
            channelId,
            newValue: { memberRole: 'moderator', action: 'assign' },
        });
        return this.getGroupInfo(channelId, userId);
    }
    async demoteModerator(channelId, userId, memberId) {
        const channel = await this.watchChannel(channelId);
        const role = await this.resolveRole(channel, userId);
        this.assertCanManageModerators(role);
        const data = (channel.data ?? {});
        if (data.created_by_id === memberId) {
            throw new common_1.BadRequestException('The group creator cannot be demoted.');
        }
        if (userId === memberId) {
            throw new common_1.BadRequestException('You cannot change your own moderator role.');
        }
        if (!(channel.state.members ?? {})[memberId]) {
            throw new common_1.BadRequestException('User is not a member of this group.');
        }
        await channel.demoteModerators([memberId]);
        this.logger.log(`Moderator demoted: ${memberId} in ${channelId}`);
        await this.audit('moderator_action', await this.loadActor(userId), {
            targetUserId: memberId,
            targetUserName: (channel.state.members ?? {})[memberId]?.user?.name ?? null,
            resourceType: 'channel',
            resourceId: channelId,
            resourceName: data.name ?? null,
            channelId,
            newValue: { memberRole: 'member', action: 'demote' },
        });
        return this.getGroupInfo(channelId, userId);
    }
    channelIdOf(cid) {
        if (!cid)
            return undefined;
        return cid.includes(':') ? cid.split(':')[1] : cid;
    }
    async editMessage(userId, messageId, text) {
        const client = this.streamService.getClient();
        const result = await client.getMessage(messageId);
        const message = result.message;
        if (!message.user?.id || message.user.id !== userId) {
            throw new common_1.ForbiddenException('You can only edit your own messages.');
        }
        await client.updateMessage({ id: messageId, text, user_id: userId });
        await this.audit('message_edit', await this.loadActor(userId), {
            resourceType: 'message',
            resourceId: messageId,
            channelId: this.channelIdOf(message.channel?.cid),
            previousValue: { text: message.text ?? '' },
            newValue: { text },
        });
        return { id: messageId, updated: true };
    }
    async deleteMessage(userId, messageId) {
        const client = this.streamService.getClient();
        const result = await client.getMessage(messageId);
        const message = result.message;
        const channelId = this.channelIdOf(message.channel?.cid);
        const actor = await this.loadActor(userId);
        const isOwner = !!message.user?.id && message.user.id === userId;
        if (isOwner) {
            await client.deleteMessage(messageId, { hardDelete: false });
            await this.audit('message_delete', actor, {
                resourceType: 'message',
                resourceId: messageId,
                channelId,
                newValue: { deleted: true },
            });
            return { id: messageId, deleted: true };
        }
        await this.moderationService.deleteMessage(actor, messageId, 'Deleted by request.');
        return { id: messageId, deleted: true };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        moderation_service_1.ModerationService,
        audit_service_1.AuditService])
], ChatService);
//# sourceMappingURL=chat.service.js.map