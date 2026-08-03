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
exports.ProjectAccessService = exports.PROJECT_ROLE_RANK = void 0;
exports.hasProjectRole = hasProjectRole;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const projects_schema_1 = require("../database/schema/projects.schema");
const users_service_1 = require("../users/users.service");
const roles_1 = require("../rbac/roles");
exports.PROJECT_ROLE_RANK = {
    owner: 4,
    manager: 3,
    member: 2,
    guest: 1,
};
function hasProjectRole(role, minimum) {
    return exports.PROJECT_ROLE_RANK[role] >= exports.PROJECT_ROLE_RANK[minimum];
}
let ProjectAccessService = class ProjectAccessService {
    constructor(db, usersService) {
        this.db = db;
        this.usersService = usersService;
    }
    async memberRole(projectId, userId) {
        const [row] = await this.db
            .select()
            .from(projects_schema_1.projectMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.projectId, projectId), (0, drizzle_orm_1.eq)(projects_schema_1.projectMembers.userId, userId)));
        return row?.role ?? null;
    }
    async orgOverridePasses(userId, minimum) {
        const user = await this.usersService.findByClerkId(userId);
        if (!user)
            return false;
        if ((0, roles_1.hasMinRole)(user.role, 'admin'))
            return true;
        if (minimum !== 'owner' && (0, roles_1.hasMinRole)(user.role, 'manager'))
            return true;
        return false;
    }
    async assertMember(projectId, userId) {
        if (await this.orgOverridePasses(userId, 'member'))
            return;
        const role = await this.memberRole(projectId, userId);
        if (!role) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
    }
    async assertRole(projectId, userId, minimum) {
        if (await this.orgOverridePasses(userId, minimum))
            return;
        const role = await this.memberRole(projectId, userId);
        if (!role || !hasProjectRole(role, minimum)) {
            throw new common_1.ForbiddenException(`This action requires at least the "${minimum}" role in this project`);
        }
    }
};
exports.ProjectAccessService = ProjectAccessService;
exports.ProjectAccessService = ProjectAccessService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        users_service_1.UsersService])
], ProjectAccessService);
//# sourceMappingURL=project-access.service.js.map