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
var ProjectsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const crypto_1 = require("crypto");
const drizzle_provider_1 = require("../database/drizzle.provider");
const projects_schema_1 = require("../database/schema/projects.schema");
const project_milestones_schema_1 = require("../database/schema/project-milestones.schema");
const users_schema_1 = require("../database/schema/users.schema");
const stream_service_1 = require("../stream/stream.service");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const roles_1 = require("../rbac/roles");
const project_access_service_1 = require("./project-access.service");
let ProjectsService = ProjectsService_1 = class ProjectsService {
    constructor(db, streamService, usersService, access, notificationsService) {
        this.db = db;
        this.streamService = streamService;
        this.usersService = usersService;
        this.access = access;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ProjectsService_1.name);
    }
    async create(userId, dto) {
        const user = await this.usersService.findByUsername(userId);
        if (!user || !(0, roles_1.hasMinRole)(user.role, 'manager')) {
            throw new common_1.ForbiddenException('Only Managers and above can create projects');
        }
        const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));
        const [project] = await this.db
            .insert(projects_schema_1.projects)
            .values({
            name: dto.name,
            description: dto.description ?? null,
            avatarUrl: dto.avatarUrl ?? null,
            ownerId: userId,
        })
            .returning();
        await this.db
            .insert(projects_schema_1.projectMembers)
            .values(memberIds.map((memberId) => ({
            projectId: project.id,
            userId: memberId,
            role: memberId === userId ? 'owner' : 'member',
        })))
            .onConflictDoNothing();
        try {
            const channel = this.streamService
                .getClient()
                .channel('messaging', (0, crypto_1.randomUUID)(), this.projectChannelData(project, memberIds));
            await channel.create();
            await this.db
                .update(projects_schema_1.projects)
                .set({ channelId: channel.id ?? null })
                .where((0, drizzle_orm_1.eq)(projects_schema_1.projects.id, project.id));
        }
        catch (err) {
            this.logger.warn(`Failed to create Stream channel for project: ${err}`);
        }
        const added = memberIds.filter((m) => m !== userId);
        if (added.length > 0) {
            await this.notificationsService.createMany(added.map((m) => ({
                userId: m,
                type: 'added_to_project',
                title: 'Added to project',
                description: project.name,
                actionUrl: `/projects/${project.id}`,
            })));
        }
        return this.summary(project, memberIds.length, 'owner');
    }
    projectChannelData(project, memberIds) {
        return {
            name: project.name,
            description: project.description ?? undefined,
            image: project.avatarUrl ?? undefined,
            channel_kind: 'project',
            project_id: project.id,
            members: memberIds,
            created_by_id: project.ownerId,
        };
    }
    async findAll(userId) {
        const user = await this.usersService.findByUsername(userId);
        const isOrgAdmin = Boolean(user && (0, roles_1.hasMinRole)(user.role, 'admin'));
        const rows = await this.db
            .select({ project: projects_schema_1.projects, memberCount: (0, drizzle_orm_1.count)(projects_schema_1.projectMembers.userId) })
            .from(projects_schema_1.projects)
            .leftJoin(projects_schema_1.projectMembers, (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, projects_schema_1.projects.id))
            .where(isOrgAdmin ? undefined : (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.userId, userId))
            .groupBy(projects_schema_1.projects.id)
            .orderBy((0, drizzle_orm_1.desc)(projects_schema_1.projects.createdAt));
        const projectIds = rows.map((r) => r.project.id);
        const memberships = projectIds.length
            ? await this.db
                .select()
                .from(projects_schema_1.projectMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(projects_schema_1.projectMembers.projectId, projectIds), (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.userId, userId)))
            : [];
        const roleByProject = new Map(memberships.map((m) => [m.projectId, m.role]));
        return rows.map((r) => this.summary(r.project, r.memberCount, roleByProject.get(r.project.id) ?? null));
    }
    async findOne(id, userId) {
        await this.access.assertMember(id, userId);
        const project = await this.requireProject(id);
        const [memberCountRow] = await this.db
            .select({ n: (0, drizzle_orm_1.count)(projects_schema_1.projectMembers.userId) })
            .from(projects_schema_1.projectMembers)
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, id));
        const role = await this.access.memberRole(id, userId);
        return this.summary(project, memberCountRow?.n ?? 0, role);
    }
    async requireProject(id) {
        const [project] = await this.db
            .select()
            .from(projects_schema_1.projects)
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projects.id, id));
        if (!project)
            throw new common_1.NotFoundException(`Project ${id} not found`);
        return project;
    }
    summary(project, memberCount, currentUserRole) {
        return {
            id: project.id,
            name: project.name,
            description: project.description,
            avatarUrl: project.avatarUrl,
            ownerId: project.ownerId,
            channelId: project.channelId,
            memberCount,
            currentUserRole,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
    async update(id, userId, dto) {
        await this.access.assertRole(id, userId, 'manager');
        const [project] = await this.db
            .update(projects_schema_1.projects)
            .set({
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projects.id, id))
            .returning();
        await this.pushChannelDetails(project);
        return this.findOne(id, userId);
    }
    async remove(id, userId) {
        await this.access.assertRole(id, userId, 'owner');
        const project = await this.requireProject(id);
        if (project.channelId) {
            try {
                await this.streamService
                    .getClient()
                    .channel('messaging', project.channelId)
                    .delete();
            }
            catch (err) {
                this.logger.warn(`Failed to delete project channel: ${err}`);
            }
        }
        const milestoneChannels = await this.db
            .select({ streamChannelId: project_milestones_schema_1.projectMilestones.streamChannelId })
            .from(project_milestones_schema_1.projectMilestones)
            .where((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.projectId, id));
        await Promise.all(milestoneChannels.map(async (m) => {
            if (!m.streamChannelId)
                return;
            try {
                await this.streamService
                    .getClient()
                    .channel('messaging', m.streamChannelId)
                    .delete();
            }
            catch (err) {
                this.logger.warn(`Failed to delete milestone channel: ${err}`);
            }
        }));
        await this.db.delete(projects_schema_1.projects).where((0, drizzle_orm_1.eq)(projects_schema_1.projects.id, id));
    }
    async listMembers(id, userId) {
        await this.access.assertMember(id, userId);
        const rows = await this.db
            .select({
            id: projects_schema_1.projectMembers.userId,
            role: projects_schema_1.projectMembers.role,
            name: users_schema_1.users.firstName,
            email: users_schema_1.users.email,
            imageUrl: users_schema_1.users.imageUrl,
        })
            .from(projects_schema_1.projectMembers)
            .leftJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(users_schema_1.users.username, projects_schema_1.projectMembers.userId))
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, id))
            .orderBy(projects_schema_1.projectMembers.joinedAt);
        return rows.map((r) => ({
            id: r.id,
            role: r.role,
            name: r.name ?? null,
            email: r.email ?? null,
            imageUrl: r.imageUrl ?? null,
        }));
    }
    async addMember(id, userId, memberId, role = 'member') {
        await this.access.assertRole(id, userId, 'manager');
        if (memberId === userId && role !== 'owner') {
            throw new common_1.BadRequestException('You cannot add yourself with that role');
        }
        const target = await this.usersService.findByUsername(memberId);
        if (!target) {
            throw new common_1.BadRequestException('User not found in the organization');
        }
        await this.db
            .insert(projects_schema_1.projectMembers)
            .values({ projectId: id, userId: memberId, role })
            .onConflictDoUpdate({
            target: [projects_schema_1.projectMembers.projectId, projects_schema_1.projectMembers.userId],
            set: { role, joinedAt: new Date() },
        });
        await this.pushChannelMemberIds(id, [memberId], []);
        const project = await this.requireProject(id);
        await this.notificationsService.create({
            userId: memberId,
            type: 'added_to_project',
            title: 'Added to project',
            description: project.name,
            actionUrl: `/projects/${project.id}`,
        });
        return this.listMembers(id, userId);
    }
    async removeMember(id, userId, memberId) {
        await this.access.assertRole(id, userId, 'manager');
        if (memberId === userId) {
            throw new common_1.BadRequestException('Owners and managers must not remove themselves');
        }
        const role = await this.access.memberRole(id, memberId);
        if (role === 'owner') {
            throw new common_1.ForbiddenException('The project owner cannot be removed');
        }
        await this.db
            .delete(projects_schema_1.projectMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, id), (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.userId, memberId)));
        await this.pushChannelMemberIds(id, [], [memberId]);
        return this.listMembers(id, userId);
    }
    async updateMemberRole(id, userId, memberId, role) {
        await this.access.assertRole(id, userId, 'manager');
        if (memberId === userId) {
            throw new common_1.BadRequestException('You cannot change your own role');
        }
        const current = await this.access.memberRole(id, memberId);
        if (current === 'owner') {
            throw new common_1.ForbiddenException('The project owner role cannot be changed');
        }
        if (role === 'owner') {
            throw new common_1.ForbiddenException('Use ownership transfer to assign the owner role');
        }
        await this.db
            .update(projects_schema_1.projectMembers)
            .set({ role })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, id), (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.userId, memberId)));
        return this.listMembers(id, userId);
    }
    async pushChannelDetails(project) {
        if (!project.channelId) {
            this.logger.warn(`Project ${project.id} has no linked channel; skipping sync`);
            return;
        }
        const channel = this.streamService
            .getClient()
            .channel('messaging', project.channelId);
        await channel.updatePartial({
            set: {
                name: project.name,
                description: project.description ?? '',
                ...(project.avatarUrl ? { image: project.avatarUrl } : {}),
            },
        });
    }
    async pushChannelMemberIds(projectId, added, removed) {
        const project = await this.requireProject(projectId);
        if (!project.channelId)
            return;
        const channel = this.streamService
            .getClient()
            .channel('messaging', project.channelId);
        if (added.length > 0)
            await channel.addMembers(added);
        if (removed.length > 0)
            await channel.removeMembers(removed);
    }
    async memberRoleFor(id, userId) {
        await this.access.assertMember(id, userId);
        return this.access.memberRole(id, userId);
    }
    getAccess() {
        return this.access;
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = ProjectsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        users_service_1.UsersService,
        project_access_service_1.ProjectAccessService,
        notifications_service_1.NotificationsService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map