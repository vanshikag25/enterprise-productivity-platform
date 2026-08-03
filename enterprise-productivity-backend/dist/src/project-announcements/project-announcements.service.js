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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectAnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const project_announcements_schema_1 = require("../database/schema/project-announcements.schema");
const projects_schema_1 = require("../database/schema/projects.schema");
const users_schema_1 = require("../database/schema/users.schema");
const notifications_service_1 = require("../notifications/notifications.service");
const project_access_service_1 = require("../projects/project-access.service");
let ProjectAnnouncementsService = class ProjectAnnouncementsService {
    constructor(db, access, notificationsService) {
        this.db = db;
        this.access = access;
        this.notificationsService = notificationsService;
    }
    async create(projectId, userId, dto) {
        await this.access.assertRole(projectId, userId, 'manager');
        const [announcement] = await this.db
            .insert(project_announcements_schema_1.projectAnnouncements)
            .values({
            projectId,
            authorId: userId,
            title: dto.title,
            body: dto.body,
            isPinned: dto.isPinned ?? false,
        })
            .returning();
        const members = await this.db
            .select({ userId: projects_schema_1.projectMembers.userId })
            .from(projects_schema_1.projectMembers)
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, projectId));
        const recipients = members
            .filter((m) => m.userId !== userId)
            .map((m) => ({
            userId: m.userId,
            type: 'project_announcement',
            title: 'New project announcement',
            description: dto.title,
            actionUrl: `/projects/${projectId}?tab=announcements`,
        }));
        if (recipients.length > 0) {
            await this.notificationsService.createMany(recipients);
        }
        return this.decorate(announcement, userId);
    }
    async findAll(projectId, userId, q) {
        await this.access.assertMember(projectId, userId);
        const conditions = [
            (0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.projectId, projectId),
        ];
        const term = q?.trim();
        const termClause = term
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(project_announcements_schema_1.projectAnnouncements.title, `%${term}%`), (0, drizzle_orm_1.ilike)(project_announcements_schema_1.projectAnnouncements.body, `%${term}%`))
            : undefined;
        if (termClause)
            conditions.push(termClause);
        const rows = await this.db
            .select()
            .from(project_announcements_schema_1.projectAnnouncements)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(project_announcements_schema_1.projectAnnouncements.isPinned), (0, drizzle_orm_1.desc)(project_announcements_schema_1.projectAnnouncements.createdAt));
        return this.decorateMany(rows, userId);
    }
    async update(projectId, userId, id, dto) {
        await this.access.assertRole(projectId, userId, 'manager');
        const announcement = await this.requireInProject(id, projectId);
        const [updated] = await this.db
            .update(project_announcements_schema_1.projectAnnouncements)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.body !== undefined && { body: dto.body }),
            ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.id, announcement.id))
            .returning();
        return this.decorate(updated, userId);
    }
    async setPinned(projectId, userId, id, isPinned) {
        await this.access.assertRole(projectId, userId, 'manager');
        const announcement = await this.requireInProject(id, projectId);
        const [updated] = await this.db
            .update(project_announcements_schema_1.projectAnnouncements)
            .set({ isPinned, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.id, announcement.id))
            .returning();
        return this.decorate(updated, userId);
    }
    async remove(projectId, userId, id) {
        await this.access.assertRole(projectId, userId, 'manager');
        await this.requireInProject(id, projectId);
        await this.db
            .delete(project_announcements_schema_1.projectAnnouncements)
            .where((0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.id, id));
    }
    async addReaction(projectId, userId, id, emoji) {
        await this.access.assertMember(projectId, userId);
        const announcement = await this.requireInProject(id, projectId);
        await this.db
            .insert(project_announcements_schema_1.projectAnnouncementReactions)
            .values({ announcementId: announcement.id, userId, emoji })
            .onConflictDoNothing();
        return this.decorate(announcement, userId);
    }
    async removeReaction(projectId, userId, id, emoji) {
        await this.access.assertMember(projectId, userId);
        const announcement = await this.requireInProject(id, projectId);
        await this.db
            .delete(project_announcements_schema_1.projectAnnouncementReactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncementReactions.announcementId, announcement.id), (0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncementReactions.userId, userId), (0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncementReactions.emoji, emoji)));
        return this.decorate(announcement, userId);
    }
    async requireInProject(id, projectId) {
        const [row] = await this.db
            .select()
            .from(project_announcements_schema_1.projectAnnouncements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.id, id), (0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.projectId, projectId)));
        if (!row)
            throw new common_1.NotFoundException(`Announcement ${id} not found`);
        return row;
    }
    async decorateMany(rows, currentUserId) {
        if (rows.length === 0)
            return [];
        const ids = rows.map((r) => r.id);
        const reactions = await this.db
            .select()
            .from(project_announcements_schema_1.projectAnnouncementReactions)
            .where((0, drizzle_orm_1.inArray)(project_announcements_schema_1.projectAnnouncementReactions.announcementId, ids));
        const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
        const authors = authorIds.length
            ? await this.db
                .select()
                .from(users_schema_1.users)
                .where((0, drizzle_orm_1.inArray)(users_schema_1.users.clerkId, authorIds))
            : [];
        const authorNames = new Map(authors.map((u) => [
            u.clerkId,
            [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        ]));
        return rows.map((row) => {
            const rowReactions = reactions.filter((r) => r.announcementId === row.id);
            const grouped = new Map();
            for (const r of rowReactions) {
                const entry = grouped.get(r.emoji) ?? { count: 0, reactedByMe: false };
                entry.count += 1;
                if (r.userId === currentUserId)
                    entry.reactedByMe = true;
                grouped.set(r.emoji, entry);
            }
            return {
                ...row,
                authorName: authorNames.get(row.authorId) ?? null,
                reactions: Array.from(grouped, ([emoji, value]) => ({
                    emoji,
                    count: value.count,
                    reactedByMe: value.reactedByMe,
                })),
                reactionCount: rowReactions.length,
            };
        });
    }
    async decorate(row, currentUserId) {
        const [decorated] = await this.decorateMany([row], currentUserId);
        return decorated;
    }
};
exports.ProjectAnnouncementsService = ProjectAnnouncementsService;
exports.ProjectAnnouncementsService = ProjectAnnouncementsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        project_access_service_1.ProjectAccessService,
        notifications_service_1.NotificationsService])
], ProjectAnnouncementsService);
//# sourceMappingURL=project-announcements.service.js.map