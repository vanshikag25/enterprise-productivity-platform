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
var ProjectMilestonesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMilestonesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const crypto_1 = require("crypto");
const drizzle_provider_1 = require("../database/drizzle.provider");
const project_milestones_schema_1 = require("../database/schema/project-milestones.schema");
const projects_schema_1 = require("../database/schema/projects.schema");
const users_schema_1 = require("../database/schema/users.schema");
const stream_service_1 = require("../stream/stream.service");
const notifications_service_1 = require("../notifications/notifications.service");
const project_access_service_1 = require("../projects/project-access.service");
const create_milestone_dto_1 = require("./dto/create-milestone.dto");
let ProjectMilestonesService = ProjectMilestonesService_1 = class ProjectMilestonesService {
    constructor(db, streamService, access, notificationsService) {
        this.db = db;
        this.streamService = streamService;
        this.access = access;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ProjectMilestonesService_1.name);
    }
    async create(projectId, userId, dto) {
        await this.access.assertRole(projectId, userId, 'manager');
        let streamChannelId = null;
        try {
            const members = await this.projectMemberIds(projectId);
            const channel = this.streamService
                .getClient()
                .channel('messaging', (0, crypto_1.randomUUID)(), this.milestoneChannelData(projectId, userId, dto.title, members));
            await channel.create();
            streamChannelId = channel.id ?? null;
        }
        catch (err) {
            this.logger.warn(`Failed to create milestone thread channel: ${err}`);
        }
        const [milestone] = await this.db
            .insert(project_milestones_schema_1.projectMilestones)
            .values({
            projectId,
            title: dto.title,
            description: dto.description ?? null,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            ownerId: dto.ownerId ?? null,
            status: dto.status ?? 'planned',
            progress: dto.progress ?? 0,
            streamChannelId,
        })
            .returning();
        await this.notifyMembers(projectId, userId, 'New milestone added', milestone.title, 'project_milestone');
        return this.decorate(milestone);
    }
    async findAll(projectId, userId, status, sortBy) {
        await this.access.assertMember(projectId, userId);
        const conditions = [(0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.projectId, projectId)];
        if (status &&
            create_milestone_dto_1.MILESTONE_STATUSES.includes(status)) {
            conditions.push((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.status, status));
        }
        const order = this.orderFor(sortBy);
        const rows = await this.db
            .select()
            .from(project_milestones_schema_1.projectMilestones)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(...order);
        return this.decorateMany(rows);
    }
    orderFor(sortBy) {
        switch (sortBy) {
            case 'dueDate':
                return [
                    (0, drizzle_orm_1.asc)(project_milestones_schema_1.projectMilestones.dueDate),
                    (0, drizzle_orm_1.desc)(project_milestones_schema_1.projectMilestones.createdAt),
                ];
            case 'progress':
                return [
                    (0, drizzle_orm_1.desc)(project_milestones_schema_1.projectMilestones.progress),
                    (0, drizzle_orm_1.desc)(project_milestones_schema_1.projectMilestones.createdAt),
                ];
            case 'status':
                return [
                    (0, drizzle_orm_1.asc)(project_milestones_schema_1.projectMilestones.status),
                    (0, drizzle_orm_1.desc)(project_milestones_schema_1.projectMilestones.createdAt),
                ];
            default:
                return [(0, drizzle_orm_1.desc)(project_milestones_schema_1.projectMilestones.createdAt)];
        }
    }
    async update(projectId, userId, id, dto) {
        await this.access.assertRole(projectId, userId, 'manager');
        await this.requireInProject(id, projectId);
        const [updated] = await this.db
            .update(project_milestones_schema_1.projectMilestones)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
            ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
            ...(dto.status !== undefined && {
                status: dto.status,
            }),
            ...(dto.progress !== undefined && { progress: dto.progress }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.id, id))
            .returning();
        if (dto.title !== undefined && updated.streamChannelId) {
            try {
                const channel = this.streamService
                    .getClient()
                    .channel('messaging', updated.streamChannelId);
                await channel.updatePartial({
                    set: {
                        name: `Milestone: ${updated.title}`,
                    },
                });
            }
            catch (err) {
                this.logger.warn(`Failed to rename milestone thread: ${err}`);
            }
        }
        return this.decorate(updated);
    }
    async updateStatus(projectId, userId, id, status) {
        await this.access.assertRole(projectId, userId, 'manager');
        const milestone = await this.requireInProject(id, projectId);
        const [updated] = await this.db
            .update(project_milestones_schema_1.projectMilestones)
            .set({
            status: status,
            progress: status === 'completed'
                ? 100
                : milestone.progress > 0
                    ? milestone.progress
                    : 0,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.id, id))
            .returning();
        await this.notifyMembers(projectId, userId, 'Milestone status changed', `${updated.title} — ${status}`, 'project_milestone');
        return this.decorate(updated);
    }
    async updateProgress(projectId, userId, id, progress) {
        await this.access.assertRole(projectId, userId, 'manager');
        const milestone = await this.requireInProject(id, projectId);
        const [updated] = await this.db
            .update(project_milestones_schema_1.projectMilestones)
            .set({
            progress,
            status: progress >= 100
                ? 'completed'
                : progress > 0 && milestone.status === 'planned'
                    ? 'in_progress'
                    : milestone.status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.id, id))
            .returning();
        return this.decorate(updated);
    }
    async remove(projectId, userId, id) {
        await this.access.assertRole(projectId, userId, 'manager');
        const milestone = await this.requireInProject(id, projectId);
        if (milestone.streamChannelId) {
            try {
                await this.streamService
                    .getClient()
                    .channel('messaging', milestone.streamChannelId)
                    .delete();
            }
            catch (err) {
                this.logger.warn(`Failed to delete milestone thread: ${err}`);
            }
        }
        await this.db.delete(project_milestones_schema_1.projectMilestones).where((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.id, id));
    }
    milestoneChannelData(projectId, createdBy, title, members) {
        return {
            name: `Milestone: ${title}`,
            description: `Discussion thread for milestone "${title}"`,
            channel_kind: 'milestone',
            project_id: projectId,
            members,
            created_by_id: createdBy,
        };
    }
    async projectMemberIds(projectId) {
        const rows = await this.db
            .select({ userId: projects_schema_1.projectMembers.userId })
            .from(projects_schema_1.projectMembers)
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, projectId));
        return rows.map((r) => r.userId);
    }
    async notifyMembers(projectId, actorId, title, description, type) {
        const memberIds = await this.projectMemberIds(projectId);
        const recipients = memberIds
            .filter((m) => m !== actorId)
            .map((m) => ({
            userId: m,
            type,
            title,
            description,
            actionUrl: `/projects/${projectId}?tab=milestones`,
        }));
        if (recipients.length > 0) {
            await this.notificationsService.createMany(recipients);
        }
    }
    async requireInProject(id, projectId) {
        const [row] = await this.db
            .select()
            .from(project_milestones_schema_1.projectMilestones)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.id, id), (0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.projectId, projectId)));
        if (!row)
            throw new common_1.NotFoundException(`Milestone ${id} not found`);
        return row;
    }
    async decorateMany(rows) {
        if (rows.length === 0)
            return [];
        const ownerIds = Array.from(new Set(rows.map((r) => r.ownerId).filter(Boolean)));
        const owners = ownerIds.length
            ? await this.db
                .select()
                .from(users_schema_1.users)
                .where((0, drizzle_orm_1.inArray)(users_schema_1.users.username, ownerIds))
            : [];
        const nameByUser = new Map(owners.map((u) => [
            u.username,
            [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        ]));
        return rows.map((row) => ({
            ...row,
            ownerName: row.ownerId ? (nameByUser.get(row.ownerId) ?? null) : null,
        }));
    }
    async decorate(row) {
        const [decorated] = await this.decorateMany([row]);
        return decorated;
    }
};
exports.ProjectMilestonesService = ProjectMilestonesService;
exports.ProjectMilestonesService = ProjectMilestonesService = ProjectMilestonesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        project_access_service_1.ProjectAccessService,
        notifications_service_1.NotificationsService])
], ProjectMilestonesService);
//# sourceMappingURL=project-milestones.service.js.map