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
var AnalyticsScopeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsScopeService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const projects_schema_1 = require("../database/schema/projects.schema");
const departments_schema_1 = require("../database/schema/departments.schema");
const users_schema_1 = require("../database/schema/users.schema");
const stream_service_1 = require("../stream/stream.service");
function isModerator(member) {
    return Boolean(member?.is_moderator ||
        member?.channel_role === 'channel_moderator' ||
        member?.channel_role === 'moderator');
}
let AnalyticsScopeService = AnalyticsScopeService_1 = class AnalyticsScopeService {
    constructor(db, streamService) {
        this.db = db;
        this.streamService = streamService;
        this.logger = new common_1.Logger(AnalyticsScopeService_1.name);
    }
    isPlatformRole(role) {
        return (role === 'super_admin' ||
            role === 'organization_owner' ||
            role === 'admin');
    }
    async resolve(actor) {
        if (this.isPlatformRole(actor.role)) {
            return { scope: 'platform', channelIds: null, actor };
        }
        if (actor.role !== 'manager') {
            throw new common_1.ForbiddenException('You do not have permission to view analytics.');
        }
        const channelIds = await this.managedChannelIds(actor);
        return { scope: 'managed', channelIds, actor };
    }
    async managedChannelIds(actor) {
        const ids = new Set();
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
        try {
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
                if (member && isModerator(member) && ch.id)
                    ids.add(ch.id);
            }
        }
        catch (err) {
            this.logger.warn(`Failed to resolve managed channels for ${actor.username}: ${err}`);
        }
        return Array.from(ids);
    }
    async requireUser(username) {
        const [user] = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, username));
        if (!user) {
            throw new common_1.ForbiddenException('User profile not found');
        }
        return user;
    }
};
exports.AnalyticsScopeService = AnalyticsScopeService;
exports.AnalyticsScopeService = AnalyticsScopeService = AnalyticsScopeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService])
], AnalyticsScopeService);
//# sourceMappingURL=analytics-scope.service.js.map