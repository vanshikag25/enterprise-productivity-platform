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
var ModerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const moderation_schema_1 = require("../database/schema/moderation.schema");
const projects_schema_1 = require("../database/schema/projects.schema");
const departments_schema_1 = require("../database/schema/departments.schema");
const users_schema_1 = require("../database/schema/users.schema");
const stream_service_1 = require("../stream/stream.service");
const users_service_1 = require("../users/users.service");
const audit_service_1 = require("../audit/audit.service");
const project_access_service_1 = require("../projects/project-access.service");
const notifications_service_1 = require("../notifications/notifications.service");
const roles_1 = require("../rbac/roles");
function fullName(user) {
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';
}
let ModerationService = ModerationService_1 = class ModerationService {
    constructor(db, streamService, usersService, projectAccess, notificationsService, auditService) {
        this.db = db;
        this.streamService = streamService;
        this.usersService = usersService;
        this.projectAccess = projectAccess;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(ModerationService_1.name);
    }
    async onModuleInit() {
        await this.ensureChannelModeratorsCanUseFrozenChannels();
    }
    async ensureChannelModeratorsCanUseFrozenChannels() {
        try {
            const client = this.streamService.getClient();
            const { grants } = await client.getChannelType('messaging');
            const grantsCopy = { ...(grants ?? {}) };
            let changed = false;
            for (const role of ['channel_moderator', 'moderator']) {
                const current = grantsCopy[role] ?? [];
                if (!current.includes('use-frozen-channel')) {
                    grantsCopy[role] = [...current, 'use-frozen-channel'];
                    changed = true;
                }
            }
            if (changed) {
                await client.updateChannelType('messaging', { grants: grantsCopy });
                this.logger.log('Granted channel moderators use-frozen-channel permission.');
            }
        }
        catch (err) {
            this.logger.warn(`Failed to configure frozen-channel permission for moderators: ${err}`);
        }
    }
    platformRole(role) {
        return (role === 'super_admin' ||
            role === 'organization_owner' ||
            role === 'admin');
    }
    async watchChannel(channelId) {
        try {
            const channel = this.streamService
                .getClient()
                .channel('messaging', channelId);
            await channel.watch();
            return channel;
        }
        catch {
            throw new common_1.BadRequestException('Channel not found.');
        }
    }
    memberIsModerator(member) {
        return Boolean(member?.is_moderator ||
            member?.channel_role === 'channel_moderator' ||
            member?.channel_role === 'moderator');
    }
    moderationApi() {
        return this.streamService.getClient().moderation;
    }
    async channelScope(channel, actor) {
        if (this.platformRole(actor.role))
            return 'platform';
        if (actor.role !== 'manager' && actor.role !== 'team_lead') {
            return 'none';
        }
        const data = (channel.data ?? {});
        const createdById = data.created_by_id;
        if (createdById === actor.username)
            return 'managed';
        const member = (channel.state?.members ?? {})[actor.username];
        if (member && this.memberIsModerator(member))
            return 'managed';
        if (actor.role === 'manager') {
            const projectId = data.project_id;
            if (projectId) {
                const projectRole = await this.projectAccess.memberRole(projectId, actor.username);
                if (projectRole && (0, project_access_service_1.hasProjectRole)(projectRole, 'manager')) {
                    return 'managed';
                }
            }
            const departmentId = data.department_id;
            if (departmentId) {
                const [dept] = await this.db
                    .select()
                    .from(departments_schema_1.departments)
                    .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, departmentId));
                if (dept && dept.createdBy === actor.username)
                    return 'managed';
            }
        }
        return 'none';
    }
    async assertCanModerateChannel(channel, actor) {
        const scope = await this.channelScope(channel, actor);
        if (scope === 'none') {
            throw new common_1.ForbiddenException('You do not have permission to moderate this channel.');
        }
        return scope;
    }
    async requireTargetUser(targetUserId) {
        const target = await this.usersService.findByUsername(targetUserId);
        if (!target)
            throw new common_1.BadRequestException('User not found.');
        return target;
    }
    assertNotSelf(actor, targetUserId) {
        if (actor.username === targetUserId) {
            throw new common_1.BadRequestException('You cannot perform a moderation action on your own account.');
        }
    }
    assertTargetRankBelow(actor, target) {
        if (roles_1.ROLE_RANK[target.role] >= roles_1.ROLE_RANK[actor.role]) {
            throw new common_1.ForbiddenException('You cannot moderate a user with an equal or higher role.');
        }
    }
    assertCanBan(actor) {
        if (!this.platformRole(actor.role)) {
            throw new common_1.ForbiddenException('Only Super Admins and Admins can ban users.');
        }
    }
    async log(actor, actionType, fields) {
        await this.db.insert(moderation_schema_1.moderationActions).values({
            moderatorId: actor.username,
            moderatorRole: actor.role,
            actionType,
            targetUserId: fields.targetUserId ?? null,
            targetMessageId: fields.targetMessageId ?? null,
            channelId: fields.channelId ?? null,
            reason: fields.reason ?? null,
        });
    }
    async audit(actionType, actor, fields) {
        await this.auditService.record({
            actionType,
            actorId: actor.username,
            actorRole: actor.role,
            actorName: fullName(actor) || actor.username,
            targetUserId: fields.targetUserId ?? null,
            targetUserName: fields.targetUserName ?? null,
            resourceType: fields.resourceType ?? 'channel',
            resourceId: fields.resourceId ?? null,
            resourceName: fields.resourceName ?? null,
            channelId: fields.channelId ?? null,
            previousValue: fields.previousValue ?? null,
            newValue: fields.newValue ?? null,
            reason: fields.reason ?? null,
        });
    }
    async managedChannelIds(actor) {
        const ids = new Set();
        if (actor.role === 'manager') {
            const projectRows = await this.db
                .select({ channelId: projects_schema_1.projects.channelId })
                .from(projects_schema_1.projectMembers)
                .innerJoin(projects_schema_1.projects, (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, projects_schema_1.projects.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.userId, actor.username), (0, drizzle_orm_1.sql) `${projects_schema_1.projectMembers.role} in ('owner', 'manager')`));
            for (const row of projectRows)
                if (row.channelId)
                    ids.add(row.channelId);
            const deptRows = await this.db
                .select({ channelId: departments_schema_1.departments.channelId })
                .from(departments_schema_1.departments)
                .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.createdBy, actor.username));
            for (const row of deptRows)
                if (row.channelId)
                    ids.add(row.channelId);
        }
        const client = this.streamService.getClient();
        const channels = await client.queryChannels({ type: 'messaging', members: { $in: [actor.username] } }, {}, { limit: 100 });
        for (const ch of channels) {
            const data = (ch.data ?? {});
            if (data.created_by_id === actor.username) {
                if (ch.id)
                    ids.add(ch.id);
                continue;
            }
            const member = (ch.state?.members ?? {})[actor.username];
            if (member && this.memberIsModerator(member) && ch.id)
                ids.add(ch.id);
        }
        return Array.from(ids);
    }
    async deleteMessage(actor, messageId, reason) {
        const client = this.streamService.getClient();
        let message;
        try {
            const result = await client.getMessage(messageId);
            message = result.message;
        }
        catch {
            throw new common_1.BadRequestException('Message not found.');
        }
        const channelId = message.cid?.split(':')[1];
        if (!channelId) {
            throw new common_1.BadRequestException('Message has no channel context.');
        }
        const channel = await this.watchChannel(channelId);
        await this.assertCanModerateChannel(channel, actor);
        await client.deleteMessage(messageId, { hardDelete: false });
        await this.log(actor, 'message_delete', {
            targetMessageId: messageId,
            channelId,
            reason,
        });
        await this.audit('message_delete', actor, {
            targetUserId: message.user?.id,
            resourceType: 'message',
            resourceId: messageId,
            channelId,
            newValue: { deleted: true },
            reason,
        });
        return { id: messageId, deleted: true };
    }
    async muteUser(actor, dto) {
        const channel = await this.watchChannel(dto.channelId);
        await this.assertCanModerateChannel(channel, actor);
        this.assertNotSelf(actor, dto.targetUserId);
        const target = await this.requireTargetUser(dto.targetUserId);
        this.assertTargetRankBelow(actor, target);
        if (actor.role === 'team_lead' && !dto.durationMinutes) {
            throw new common_1.BadRequestException('Team leads must specify a mute duration.');
        }
        const timeout = dto.durationMinutes
            ? Math.max(1, Math.round(dto.durationMinutes))
            : undefined;
        await this.moderationApi().muteUser(dto.targetUserId, {
            user_id: actor.username,
            timeout,
        });
        await this.log(actor, 'user_mute', {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            reason: dto.reason,
        });
        await this.audit('user_mute', actor, {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            previousValue: { muted: false },
            newValue: { muted: true, timeoutMinutes: dto.durationMinutes ?? null },
            reason: dto.reason,
        });
        return {
            muted: true,
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
        };
    }
    async unmuteUser(actor, dto) {
        const channel = await this.watchChannel(dto.channelId);
        await this.assertCanModerateChannel(channel, actor);
        this.assertNotSelf(actor, dto.targetUserId);
        await this.requireTargetUser(dto.targetUserId);
        await this.moderationApi().unmuteUser(dto.targetUserId, {
            user_id: actor.username,
        });
        await this.log(actor, 'user_unmute', {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            reason: dto.reason,
        });
        await this.audit('user_unmute', actor, {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            previousValue: { muted: true },
            newValue: { muted: false },
            reason: dto.reason,
        });
        return {
            muted: false,
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
        };
    }
    async removeMember(actor, dto) {
        if (actor.role === 'team_lead') {
            throw new common_1.ForbiddenException('Team leads cannot remove members from a channel.');
        }
        const channel = await this.watchChannel(dto.channelId);
        const scope = await this.assertCanModerateChannel(channel, actor);
        this.assertNotSelf(actor, dto.targetUserId);
        const data = (channel.data ?? {});
        if (data.created_by_id === dto.targetUserId) {
            throw new common_1.BadRequestException('The channel creator cannot be removed.');
        }
        const targetMember = (channel.state?.members ?? {})[dto.targetUserId];
        if (!targetMember) {
            throw new common_1.BadRequestException('User is not a member of this channel.');
        }
        if (this.memberIsModerator(targetMember) &&
            data.created_by_id !== actor.username &&
            scope !== 'platform') {
            throw new common_1.ForbiddenException('Only the channel creator or a platform admin can remove a moderator.');
        }
        await channel.removeMembers([dto.targetUserId]);
        await this.notificationsService.create({
            userId: dto.targetUserId,
            type: 'removed_from_group',
            title: 'Removed from channel',
            description: data.name ?? 'a channel',
        });
        await this.log(actor, 'member_remove', {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            reason: dto.reason,
        });
        await this.audit('member_remove', actor, {
            targetUserId: dto.targetUserId,
            targetUserName: data.name ?? null,
            channelId: dto.channelId,
            reason: dto.reason,
        });
        return { removed: true, targetUserId: dto.targetUserId };
    }
    async banUser(actor, dto) {
        this.assertCanBan(actor);
        this.assertNotSelf(actor, dto.targetUserId);
        const target = await this.requireTargetUser(dto.targetUserId);
        this.assertTargetRankBelow(actor, target);
        const client = this.streamService.getClient();
        const options = {
            reason: dto.reason,
            timeout: dto.timeoutMinutes
                ? Math.max(1, Math.round(dto.timeoutMinutes))
                : undefined,
            ban_from_future_channels: false,
        };
        if (dto.channelId) {
            const channel = await this.watchChannel(dto.channelId);
            await channel.banUser(dto.targetUserId, options);
        }
        else {
            await client.banUser(dto.targetUserId, options);
        }
        await this.log(actor, 'user_ban', {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            reason: dto.reason,
        });
        await this.audit('user_ban', actor, {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            newValue: { banned: true, timeoutMinutes: dto.timeoutMinutes ?? null },
            reason: dto.reason,
        });
        return { banned: true, targetUserId: dto.targetUserId };
    }
    async unbanUser(actor, dto) {
        this.assertCanBan(actor);
        this.assertNotSelf(actor, dto.targetUserId);
        await this.requireTargetUser(dto.targetUserId);
        const client = this.streamService.getClient();
        if (dto.channelId) {
            const channel = await this.watchChannel(dto.channelId);
            await channel.unbanUser(dto.targetUserId);
        }
        else {
            await client.unbanUser(dto.targetUserId);
        }
        await this.log(actor, 'user_unban', {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            reason: dto.reason,
        });
        await this.audit('user_unban', actor, {
            targetUserId: dto.targetUserId,
            channelId: dto.channelId,
            newValue: { banned: false },
            reason: dto.reason,
        });
        return { banned: false, targetUserId: dto.targetUserId };
    }
    async setChannelLock(actor, dto) {
        const channel = await this.watchChannel(dto.channelId);
        const scope = await this.assertCanModerateChannel(channel, actor);
        const data = (channel.data ?? {});
        if (Boolean(data.frozen) === dto.locked) {
            throw new common_1.BadRequestException(dto.locked
                ? 'This channel is already locked.'
                : 'This channel is not locked.');
        }
        if (dto.locked && scope === 'managed') {
            const member = (channel.state?.members ?? {})[actor.username];
            const isOwner = data.created_by_id === actor.username;
            if (!isOwner && !(member && this.memberIsModerator(member))) {
                try {
                    await channel.addModerators([actor.username]);
                }
                catch (err) {
                    this.logger.warn(`Failed to keep moderator ${actor.username} active in locked channel: ${err}`);
                }
            }
        }
        await channel.updatePartial({
            set: {
                frozen: dto.locked,
                locked: dto.locked,
                locked_by: dto.locked ? actor.username : null,
                locked_at: dto.locked ? new Date().toISOString() : null,
                locked_reason: dto.locked ? (dto.reason ?? '') : '',
            },
        });
        await this.log(actor, dto.locked ? 'channel_lock' : 'channel_unlock', {
            channelId: dto.channelId,
            reason: dto.reason,
        });
        await this.audit(dto.locked ? 'channel_lock' : 'channel_unlock', actor, {
            resourceType: 'channel',
            resourceId: dto.channelId,
            channelId: dto.channelId,
            previousValue: { locked: !dto.locked },
            newValue: { locked: dto.locked },
            reason: dto.reason,
        });
        return { channelId: dto.channelId, locked: dto.locked };
    }
    async createReport(actor, dto) {
        let targetUserId = dto.targetUserId;
        let targetUserName = null;
        let targetMessageText = null;
        let channelId = dto.channelId;
        const channelName = dto.channelName ?? null;
        const client = this.streamService.getClient();
        if (dto.targetType === 'message') {
            if (!dto.targetMessageId) {
                throw new common_1.BadRequestException('A target message is required.');
            }
            let message;
            try {
                const result = await client.getMessage(dto.targetMessageId);
                message = result.message;
            }
            catch {
                throw new common_1.BadRequestException('Message not found.');
            }
            targetUserId = message.user?.id;
            targetUserName = message.user?.name ?? null;
            targetMessageText = message.text ?? null;
            channelId = channelId || message.cid?.split(':')[1] || '';
        }
        else {
            if (!targetUserId) {
                throw new common_1.BadRequestException('A target user is required.');
            }
            const target = await this.usersService.findByUsername(targetUserId);
            if (target) {
                targetUserName = fullName(target) || targetUserId;
            }
        }
        if (!channelId) {
            throw new common_1.BadRequestException('A channel is required.');
        }
        try {
            const [report] = await this.db
                .insert(moderation_schema_1.moderationReports)
                .values({
                reporterId: actor.username,
                targetType: dto.targetType,
                targetMessageId: dto.targetMessageId ?? null,
                targetUserId: targetUserId ?? null,
                targetUserName,
                targetMessageText,
                channelId,
                channelName,
                reason: dto.reason,
                description: dto.description ?? null,
            })
                .returning();
            return this.serializeReport(report, fullName(actor));
        }
        catch (err) {
            const rawCode = err?.code ??
                err?.cause?.code;
            if (rawCode === '23505') {
                throw new common_1.ConflictException('You have already reported this content.');
            }
            throw err;
        }
    }
    serializeReport(report, reporterName) {
        return {
            id: report.id,
            reporterId: report.reporterId,
            reporterName: reporterName || report.reporterId,
            targetType: report.targetType,
            targetMessageId: report.targetMessageId,
            targetUserId: report.targetUserId,
            targetUserName: report.targetUserName,
            targetMessageText: report.targetMessageText,
            channelId: report.channelId,
            channelName: report.channelName,
            reason: report.reason,
            description: report.description,
            status: report.status,
            reviewedBy: report.reviewedBy,
            reviewedAt: report.reviewedAt?.toISOString() ?? null,
            resolutionNote: report.resolutionNote,
            createdAt: report.createdAt.toISOString(),
        };
    }
    async listReports(actor, params) {
        const platform = this.platformRole(actor.role);
        if (!platform && actor.role !== 'manager' && actor.role !== 'team_lead') {
            throw new common_1.ForbiddenException('You do not have permission to view reports.');
        }
        const conditions = [];
        if (params.status) {
            conditions.push((0, drizzle_orm_1.eq)(moderation_schema_1.moderationReports.status, params.status));
        }
        if (!platform) {
            const managed = await this.managedChannelIds(actor);
            conditions.push((0, drizzle_orm_1.inArray)(moderation_schema_1.moderationReports.channelId, managed));
        }
        const where = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [rows, countRows] = await Promise.all([
            this.db
                .select({
                report: moderation_schema_1.moderationReports,
                reporterFirstName: users_schema_1.users.firstName,
                reporterLastName: users_schema_1.users.lastName,
            })
                .from(moderation_schema_1.moderationReports)
                .leftJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(users_schema_1.users.username, moderation_schema_1.moderationReports.reporterId))
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(moderation_schema_1.moderationReports.createdAt))
                .limit(params.limit)
                .offset((params.page - 1) * params.limit),
            this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(moderation_schema_1.moderationReports)
                .where(where),
        ]);
        const items = rows.map((row) => this.serializeReport(row.report, fullName(row.reporterFirstName
            ? {
                firstName: row.reporterFirstName,
                lastName: row.reporterLastName,
            }
            : undefined)));
        return {
            items,
            total: countRows[0]?.count ?? 0,
            page: params.page,
            limit: params.limit,
            totalPages: Math.max(1, Math.ceil((countRows[0]?.count ?? 0) / params.limit)),
        };
    }
    async updateReport(actor, reportId, action, note) {
        const [report] = await this.db
            .select()
            .from(moderation_schema_1.moderationReports)
            .where((0, drizzle_orm_1.eq)(moderation_schema_1.moderationReports.id, reportId));
        if (!report)
            throw new common_1.BadRequestException('Report not found.');
        const platform = this.platformRole(actor.role);
        if (!platform) {
            const managed = await this.managedChannelIds(actor);
            if (!managed.includes(report.channelId)) {
                throw new common_1.ForbiddenException('You do not have permission to act on this report.');
            }
        }
        const status = action === 'review'
            ? 'reviewing'
            : action === 'resolve'
                ? 'resolved'
                : 'dismissed';
        const [updated] = await this.db
            .update(moderation_schema_1.moderationReports)
            .set({
            status,
            reviewedBy: actor.username,
            reviewedAt: new Date(),
            resolutionNote: note ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(moderation_schema_1.moderationReports.id, reportId))
            .returning();
        const actionType = action === 'review'
            ? 'report_review'
            : action === 'resolve'
                ? 'report_resolve'
                : 'report_dismiss';
        await this.log(actor, actionType, {
            targetMessageId: report.targetMessageId ?? undefined,
            targetUserId: report.targetUserId ?? undefined,
            channelId: report.channelId,
            reason: note ?? report.reason,
        });
        await this.audit('moderator_action', actor, {
            targetUserId: report.targetUserId ?? undefined,
            resourceType: report.targetType === 'message' ? 'message' : 'user',
            resourceId: report.targetMessageId ?? report.targetUserId ?? undefined,
            channelId: report.channelId,
            previousValue: { reportId, status: report.status },
            newValue: { reportId, status, action },
            reason: note ?? report.reason,
        });
        return this.serializeReport(updated, actor.username);
    }
    async listLogs(actor, params) {
        const platform = this.platformRole(actor.role);
        if (!platform && actor.role !== 'manager' && actor.role !== 'team_lead') {
            throw new common_1.ForbiddenException('You do not have permission to view moderation logs.');
        }
        const conditions = [];
        if (params.actionType) {
            conditions.push((0, drizzle_orm_1.eq)(moderation_schema_1.moderationActions.actionType, params.actionType));
        }
        if (!platform) {
            const managed = await this.managedChannelIds(actor);
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(moderation_schema_1.moderationActions.channelId, managed), (0, drizzle_orm_1.eq)(moderation_schema_1.moderationActions.moderatorId, actor.username)));
        }
        const where = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const [rows, countRows] = await Promise.all([
            this.db
                .select({
                log: moderation_schema_1.moderationActions,
                moderatorFirstName: users_schema_1.users.firstName,
                moderatorLastName: users_schema_1.users.lastName,
            })
                .from(moderation_schema_1.moderationActions)
                .leftJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(users_schema_1.users.username, moderation_schema_1.moderationActions.moderatorId))
                .where(where)
                .orderBy((0, drizzle_orm_1.desc)(moderation_schema_1.moderationActions.createdAt))
                .limit(params.limit)
                .offset((params.page - 1) * params.limit),
            this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(moderation_schema_1.moderationActions)
                .where(where),
        ]);
        return {
            items: rows.map((row) => ({
                id: row.log.id,
                moderatorId: row.log.moderatorId,
                moderatorName: fullName(row.moderatorFirstName
                    ? {
                        firstName: row.moderatorFirstName,
                        lastName: row.moderatorLastName,
                    }
                    : undefined) || row.log.moderatorId,
                moderatorRole: row.log.moderatorRole,
                actionType: row.log.actionType,
                targetUserId: row.log.targetUserId,
                targetMessageId: row.log.targetMessageId,
                channelId: row.log.channelId,
                reason: row.log.reason,
                createdAt: row.log.createdAt.toISOString(),
            })),
            total: countRows[0]?.count ?? 0,
            page: params.page,
            limit: params.limit,
            totalPages: Math.max(1, Math.ceil((countRows[0]?.count ?? 0) / params.limit)),
        };
    }
};
exports.ModerationService = ModerationService;
exports.ModerationService = ModerationService = ModerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        users_service_1.UsersService,
        project_access_service_1.ProjectAccessService,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], ModerationService);
//# sourceMappingURL=moderation.service.js.map