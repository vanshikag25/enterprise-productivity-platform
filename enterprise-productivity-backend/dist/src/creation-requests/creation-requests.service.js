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
var CreationRequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreationRequestsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const entity_creation_requests_schema_1 = require("../database/schema/entity-creation-requests.schema");
const tasks_service_1 = require("../tasks/tasks.service");
const meetings_service_1 = require("../meetings/meetings.service");
const notifications_service_1 = require("../notifications/notifications.service");
const users_service_1 = require("../users/users.service");
const roles_1 = require("../rbac/roles");
let CreationRequestsService = CreationRequestsService_1 = class CreationRequestsService {
    constructor(db, tasksService, meetingsService, notificationsService, usersService) {
        this.db = db;
        this.tasksService = tasksService;
        this.meetingsService = meetingsService;
        this.notificationsService = notificationsService;
        this.usersService = usersService;
        this.logger = new common_1.Logger(CreationRequestsService_1.name);
    }
    async create(userId, dto) {
        const title = String(dto.payload.title ?? '').trim();
        if (!title) {
            throw new common_1.BadRequestException('Request payload must include a title.');
        }
        const [request] = await this.db
            .insert(entity_creation_requests_schema_1.entityCreationRequests)
            .values({
            entityType: dto.entityType,
            title: title.slice(0, 512),
            payload: dto.payload,
            createdById: userId,
            sourceChannelId: dto.sourceChannelId ?? null,
            sourceMessageId: dto.sourceMessageId ?? null,
            sourceSenderId: dto.sourceSenderId ?? null,
            sourceChannelName: dto.sourceChannelName ?? null,
            sourceMessageText: dto.sourceMessageText ?? null,
        })
            .returning();
        void this.notifyApprovers(request);
        this.logger.log(`Creation request ${request.id} (${request.entityType}) created by ${userId}`);
        return this.toItem(request);
    }
    async findAll(userId, entityType) {
        const user = await this.usersService.findByUsername(userId);
        const isApprover = Boolean(user && (0, roles_1.hasMinRole)(user.role, roles_1.UserRole.TEAM_LEAD));
        const conditions = [
            ...(entityType
                ? [(0, drizzle_orm_1.eq)(entity_creation_requests_schema_1.entityCreationRequests.entityType, entityType)]
                : []),
            ...(isApprover
                ? []
                : [(0, drizzle_orm_1.eq)(entity_creation_requests_schema_1.entityCreationRequests.createdById, userId)]),
        ];
        const rows = await this.db
            .select()
            .from(entity_creation_requests_schema_1.entityCreationRequests)
            .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
            .orderBy((0, drizzle_orm_1.desc)(entity_creation_requests_schema_1.entityCreationRequests.createdAt));
        return rows.map((r) => this.toItem(r));
    }
    async findOne(requestId, userId) {
        const request = await this.getRequest(requestId);
        const user = await this.usersService.findByUsername(userId);
        const isApprover = Boolean(user && (0, roles_1.hasMinRole)(user.role, roles_1.UserRole.TEAM_LEAD));
        if (!isApprover && request.createdById !== userId) {
            throw new common_1.ForbiddenException('You cannot view this request');
        }
        return this.toItem(request);
    }
    async approve(requestId, userId, dto) {
        const request = await this.getRequest(requestId);
        await this.assertApprover(userId);
        if (request.status !== 'pending') {
            throw new common_1.BadRequestException('This request has already been reviewed.');
        }
        const entity = await this.createEntity(request);
        const [updated] = await this.db
            .update(entity_creation_requests_schema_1.entityCreationRequests)
            .set({
            status: 'approved',
            reviewedById: userId,
            reviewedAt: new Date(),
            reviewNote: dto.note ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(entity_creation_requests_schema_1.entityCreationRequests.id, requestId))
            .returning();
        await this.notificationsService.create({
            userId: request.createdById,
            type: 'creation_request_approved',
            title: request.entityType === 'meeting'
                ? 'Meeting request approved'
                : 'Task request approved',
            description: `"${request.title}" was approved and created.`,
            actionUrl: request.entityType === 'meeting' ? '/meetings' : '/tasks',
        });
        this.logger.log(`Creation request ${requestId} approved by ${userId}; entity ${JSON.stringify(entity)}`);
        return { request: this.toItem(updated), entity };
    }
    async reject(requestId, userId, dto) {
        const request = await this.getRequest(requestId);
        await this.assertApprover(userId);
        if (request.status !== 'pending') {
            throw new common_1.BadRequestException('This request has already been reviewed.');
        }
        const [updated] = await this.db
            .update(entity_creation_requests_schema_1.entityCreationRequests)
            .set({
            status: 'rejected',
            reviewedById: userId,
            reviewedAt: new Date(),
            reviewNote: dto.note ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(entity_creation_requests_schema_1.entityCreationRequests.id, requestId))
            .returning();
        await this.notificationsService.create({
            userId: request.createdById,
            type: 'creation_request_rejected',
            title: request.entityType === 'meeting'
                ? 'Meeting request declined'
                : 'Task request declined',
            description: `"${request.title}" was declined.`,
            actionUrl: request.entityType === 'meeting' ? '/meetings' : '/tasks',
        });
        this.logger.log(`Creation request ${requestId} rejected by ${userId}`);
        return this.toItem(updated);
    }
    async createEntity(request) {
        const payload = request.payload;
        const source = {
            sourceChannelId: request.sourceChannelId ?? undefined,
            sourceMessageId: request.sourceMessageId ?? undefined,
            sourceSenderId: request.sourceSenderId ?? undefined,
            sourceChannelName: request.sourceChannelName ?? undefined,
        };
        if (request.entityType === 'meeting') {
            const participants = Array.isArray(payload.participants)
                ? payload.participants
                : [];
            if (!participants.length) {
                throw new common_1.BadRequestException('Meeting request payload must include participants.');
            }
            const title = String(payload.title ?? '').trim();
            const scheduledDate = String(payload.scheduledDate ?? '');
            const startTime = String(payload.startTime ?? '');
            const endTime = String(payload.endTime ?? '');
            if (!title || !scheduledDate || !startTime || !endTime) {
                throw new common_1.BadRequestException('Meeting request payload is missing required fields.');
            }
            const meeting = await this.meetingsService.create(request.createdById, {
                title,
                description: typeof payload.description === 'string' ? payload.description : undefined,
                scheduledDate,
                startTime,
                endTime,
                participants,
                ...source,
            });
            return { type: 'meeting', id: meeting.id, title: meeting.title };
        }
        const title = String(payload.title ?? '').trim();
        if (!title) {
            throw new common_1.BadRequestException('Task request payload must include a title.');
        }
        const task = await this.tasksService.create(request.createdById, {
            title,
            description: typeof payload.description === 'string' ? payload.description : undefined,
            status: typeof payload.status === 'string' ? payload.status : undefined,
            priority: typeof payload.priority === 'string' ? payload.priority : undefined,
            dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : undefined,
            assignee: typeof payload.assignee === 'string' ? payload.assignee : undefined,
            ...source,
        });
        return { type: 'task', id: task.id, title: task.title };
    }
    async getRequest(requestId) {
        const [row] = await this.db
            .select()
            .from(entity_creation_requests_schema_1.entityCreationRequests)
            .where((0, drizzle_orm_1.eq)(entity_creation_requests_schema_1.entityCreationRequests.id, requestId))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException(`Request ${requestId} not found`);
        return row;
    }
    async assertApprover(userId) {
        const user = await this.usersService.findByUsername(userId);
        const minimum = roles_1.UserRole.TEAM_LEAD;
        if (!user || !(0, roles_1.hasMinRole)(user.role, minimum)) {
            throw new common_1.ForbiddenException('Only team leads and above can review creation requests.');
        }
    }
    async notifyApprovers(request) {
        try {
            const users = await this.usersService.findAllExcept(request.createdById);
            const approvers = users.filter((u) => roles_1.ROLE_RANK[u.role] >= roles_1.ROLE_RANK[roles_1.UserRole.TEAM_LEAD]);
            if (approvers.length === 0)
                return;
            await this.notificationsService.createMany(approvers.map((u) => ({
                userId: u.username,
                type: 'creation_request',
                title: request.entityType === 'meeting'
                    ? 'Meeting creation request'
                    : 'Task creation request',
                description: `"${request.title}" awaits your approval.`,
                actionUrl: request.entityType === 'meeting' ? '/meetings' : '/tasks',
            })));
        }
        catch (err) {
            this.logger.warn(`Failed to notify approvers for ${request.id}: ${err instanceof Error ? err.message : err}`);
        }
    }
    toItem(request) {
        return {
            id: request.id,
            entityType: request.entityType,
            status: request.status,
            title: request.title,
            payload: request.payload,
            createdById: request.createdById,
            sourceChannelId: request.sourceChannelId ?? null,
            sourceMessageId: request.sourceMessageId ?? null,
            sourceSenderId: request.sourceSenderId ?? null,
            sourceChannelName: request.sourceChannelName ?? null,
            sourceMessageText: request.sourceMessageText ?? null,
            reviewedById: request.reviewedById ?? null,
            reviewedAt: request.reviewedAt
                ? request.reviewedAt.toISOString()
                : null,
            reviewNote: request.reviewNote ?? null,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
        };
    }
};
exports.CreationRequestsService = CreationRequestsService;
exports.CreationRequestsService = CreationRequestsService = CreationRequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        tasks_service_1.TasksService,
        meetings_service_1.MeetingsService,
        notifications_service_1.NotificationsService,
        users_service_1.UsersService])
], CreationRequestsService);
//# sourceMappingURL=creation-requests.service.js.map