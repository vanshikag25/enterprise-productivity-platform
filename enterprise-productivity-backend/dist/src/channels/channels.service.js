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
var ChannelsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const stream_service_1 = require("../stream/stream.service");
const users_service_1 = require("../users/users.service");
const departments_service_1 = require("../departments/departments.service");
const notifications_service_1 = require("../notifications/notifications.service");
const roles_1 = require("../rbac/roles");
let ChannelsService = ChannelsService_1 = class ChannelsService {
    constructor(streamService, usersService, departmentsService, notificationsService) {
        this.streamService = streamService;
        this.usersService = usersService;
        this.departmentsService = departmentsService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ChannelsService_1.name);
    }
    async requireRole(userId, minimum) {
        const user = await this.usersService.findByUsername(userId);
        if (!user || !(0, roles_1.hasMinRole)(user.role, minimum)) {
            throw new common_1.ForbiddenException('Insufficient permissions for this action');
        }
    }
    toSummary(channel) {
        const data = (channel.data ?? {});
        return {
            id: channel.id,
            name: data.name,
            description: data.description ?? '',
            kind: data.channel_kind,
            departmentId: data.department_id ?? null,
            createdBy: data.created_by_id,
            createdAt: data.created_at,
            memberCount: Object.keys(channel.state.members ?? {}).length,
            frozen: Boolean(data.frozen),
        };
    }
    async create(userId, dto) {
        await this.requireRole(userId, 'manager');
        let members;
        let departmentId;
        if (dto.kind === 'department') {
            if (!dto.departmentId)
                throw new common_1.BadRequestException('departmentId is required');
            const dept = await this.departmentsService.findOne(dto.departmentId);
            members = Array.from(new Set([userId, ...dept.memberIds]));
            departmentId = dept.id;
        }
        else {
            members = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));
        }
        const channelId = (0, crypto_1.randomUUID)();
        const customData = {
            name: dto.name,
            description: dto.description ?? '',
            channel_kind: dto.kind,
            created_by_id: userId,
            members,
            ...(departmentId ? { department_id: departmentId } : {}),
            ...(dto.kind === 'announcement' ? { frozen: true } : {}),
        };
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId, customData);
        await channel.create();
        if (dto.kind === 'announcement') {
            try {
                await channel.addModerators([userId]);
            }
            catch (err) {
                this.logger.warn(`Failed to set moderator: ${err}`);
            }
        }
        if (dto.kind === 'department' && departmentId) {
            await this.departmentsService.setChannelId(departmentId, channel.id);
        }
        await this.notificationsService.createMany(members
            .filter((m) => m !== userId)
            .map((m) => ({
            userId: m,
            type: dto.kind === 'department'
                ? 'added_to_department'
                : 'added_to_group',
            title: dto.kind === 'department'
                ? 'Added to department channel'
                : 'Added to group',
            description: dto.name,
            actionUrl: dto.kind === 'department'
                ? '/department-channels'
                : dto.kind === 'announcement'
                    ? '/announcements'
                    : '/organization-channels',
        })));
        return this.toSummary(channel);
    }
    async list(kind) {
        const response = await this.streamService
            .getClient()
            .queryChannels({ type: 'messaging', channel_kind: kind }, {}, { limit: 100 });
        return response.map((c) => this.toSummary(c));
    }
    async getWatchedChannel(id) {
        const channel = this.streamService.getClient().channel('messaging', id);
        await channel.watch();
        return channel;
    }
    async findOne(id) {
        const channel = await this.getWatchedChannel(id);
        return this.toSummary(channel);
    }
    async requireCreatorOrPrivileged(id, userId) {
        const channel = await this.getWatchedChannel(id);
        const data = (channel.data ?? {});
        if (data.created_by_id === userId)
            return channel;
        const user = await this.usersService.findByUsername(userId);
        if (user && (0, roles_1.hasMinRole)(user.role, 'manager'))
            return channel;
        throw new common_1.ForbiddenException('Only the creator, Manager, or a higher role can perform this action');
    }
    async update(id, userId, dto) {
        const channel = await this.requireCreatorOrPrivileged(id, userId);
        await channel.updatePartial({ set: { ...dto } });
        return this.toSummary(channel);
    }
    async remove(id, userId) {
        const channel = await this.requireCreatorOrPrivileged(id, userId);
        await channel.delete();
    }
    async join(id, userId) {
        const channel = await this.getWatchedChannel(id);
        await channel.addMembers([userId]);
        return this.toSummary(channel);
    }
    async leave(id, userId) {
        const channel = await this.getWatchedChannel(id);
        await channel.removeMembers([userId]);
        return this.toSummary(channel);
    }
    async addMember(id, userId, memberId) {
        await this.requireCreatorOrPrivileged(id, userId);
        const channel = await this.getWatchedChannel(id);
        await channel.addMembers([memberId]);
        const data = (channel.data ?? {});
        const kind = data.channel_kind;
        await this.notificationsService.create({
            userId: memberId,
            type: kind === 'department' ? 'added_to_department' : 'added_to_group',
            title: kind === 'department'
                ? 'Added to department channel'
                : 'Added to group',
            description: data.name,
            actionUrl: kind === 'department'
                ? '/department-channels'
                : '/organization-channels',
        });
        return this.toSummary(channel);
    }
    async removeMember(id, userId, memberId) {
        await this.requireCreatorOrPrivileged(id, userId);
        const channel = await this.getWatchedChannel(id);
        await channel.removeMembers([memberId]);
        return this.toSummary(channel);
    }
    async listMembers(id) {
        const channel = await this.getWatchedChannel(id);
        return Object.values(channel.state.members ?? {}).map((m) => {
            const member = m;
            return {
                id: member.user?.id,
                name: member.user?.name,
                imageUrl: member.user?.image,
            };
        });
    }
};
exports.ChannelsService = ChannelsService;
exports.ChannelsService = ChannelsService = ChannelsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stream_service_1.StreamService,
        users_service_1.UsersService,
        departments_service_1.DepartmentsService,
        notifications_service_1.NotificationsService])
], ChannelsService);
//# sourceMappingURL=channels.service.js.map