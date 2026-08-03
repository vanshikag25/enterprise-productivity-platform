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
exports.AiSummaryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const project_announcements_schema_1 = require("../database/schema/project-announcements.schema");
const project_milestones_schema_1 = require("../database/schema/project-milestones.schema");
const projects_schema_1 = require("../database/schema/projects.schema");
const stream_service_1 = require("../stream/stream.service");
const projects_service_1 = require("../projects/projects.service");
const project_access_service_1 = require("../projects/project-access.service");
const ai_summary_provider_1 = require("./ai-summary.provider");
let AiSummaryService = class AiSummaryService {
    constructor(db, streamService, projectsService, access, provider) {
        this.db = db;
        this.streamService = streamService;
        this.projectsService = projectsService;
        this.access = access;
        this.provider = provider;
    }
    async generate(projectId, userId) {
        await this.access.assertMember(projectId, userId);
        const project = await this.projectsService.requireProject(projectId);
        const [memberCountRow] = await this.db
            .select({ n: (0, drizzle_orm_1.count)(projects_schema_1.projectMembers.userId) })
            .from(projects_schema_1.projectMembers)
            .where((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, projectId));
        const [announcements, milestones, recentMessages] = await Promise.all([
            this.db
                .select()
                .from(project_announcements_schema_1.projectAnnouncements)
                .where((0, drizzle_orm_1.eq)(project_announcements_schema_1.projectAnnouncements.projectId, projectId))
                .orderBy((0, drizzle_orm_1.desc)(project_announcements_schema_1.projectAnnouncements.createdAt))
                .limit(10),
            this.db
                .select({
                title: project_milestones_schema_1.projectMilestones.title,
                status: project_milestones_schema_1.projectMilestones.status,
                progress: project_milestones_schema_1.projectMilestones.progress,
            })
                .from(project_milestones_schema_1.projectMilestones)
                .where((0, drizzle_orm_1.eq)(project_milestones_schema_1.projectMilestones.projectId, projectId)),
            this.fetchRecentMessages(project.channelId),
        ]);
        const context = {
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
            },
            memberCount: memberCountRow?.n ?? 0,
            announcements: announcements.map((a) => ({
                title: a.title,
                body: a.body,
                author: a.authorId,
            })),
            milestones,
            recentMessages,
        };
        return this.provider.generate(context);
    }
    async fetchRecentMessages(channelId) {
        if (!channelId)
            return [];
        try {
            const channel = this.streamService
                .getClient()
                .channel('messaging', channelId);
            const response = await channel.query({ messages: { limit: 30 } });
            return response.messages.map((m) => ({
                user: m.user?.name ?? m.user?.id ?? 'Unknown',
                text: m.text ?? '',
                createdAt: m.created_at ?? null,
            }));
        }
        catch {
            return [];
        }
    }
};
exports.AiSummaryService = AiSummaryService;
exports.AiSummaryService = AiSummaryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __param(4, (0, common_1.Inject)(ai_summary_provider_1.AI_SUMMARY_PROVIDER)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        projects_service_1.ProjectsService,
        project_access_service_1.ProjectAccessService, Object])
], AiSummaryService);
//# sourceMappingURL=ai-summary.service.js.map