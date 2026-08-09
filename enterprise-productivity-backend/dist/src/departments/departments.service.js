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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const departments_schema_1 = require("../database/schema/departments.schema");
const users_service_1 = require("../users/users.service");
const roles_1 = require("../rbac/roles");
let DepartmentsService = class DepartmentsService {
    constructor(db, usersService) {
        this.db = db;
        this.usersService = usersService;
    }
    async requireRole(userId, minimum) {
        const user = await this.usersService.findByUsername(userId);
        if (!user || !(0, roles_1.hasMinRole)(user.role, minimum)) {
            throw new common_1.ForbiddenException('Insufficient permissions for this action');
        }
    }
    async create(userId, dto) {
        await this.requireRole(userId, 'admin');
        const [dept] = await this.db
            .insert(departments_schema_1.departments)
            .values({
            name: dto.name,
            description: dto.description ?? null,
            memberIds: Array.from(new Set([userId, ...(dto.memberIds ?? [])])),
            createdBy: userId,
        })
            .returning();
        return dept;
    }
    async findMine(userId) {
        const user = await this.usersService.findByUsername(userId);
        const all = await this.db.select().from(departments_schema_1.departments);
        if (user && (0, roles_1.hasMinRole)(user.role, 'admin'))
            return all;
        return all.filter((d) => d.memberIds.includes(userId));
    }
    async findOne(id) {
        const [dept] = await this.db
            .select()
            .from(departments_schema_1.departments)
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id));
        if (!dept)
            throw new common_1.NotFoundException('Department not found');
        return dept;
    }
    async update(id, userId, dto) {
        await this.requireRole(userId, 'admin');
        const [updated] = await this.db
            .update(departments_schema_1.departments)
            .set({ ...dto, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id))
            .returning();
        return updated;
    }
    async remove(id, userId) {
        await this.requireRole(userId, 'admin');
        await this.db.delete(departments_schema_1.departments).where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id));
    }
    async addMember(id, userId, memberId) {
        await this.requireRole(userId, 'admin');
        const dept = await this.findOne(id);
        const memberIds = Array.from(new Set([...dept.memberIds, memberId]));
        const [updated] = await this.db
            .update(departments_schema_1.departments)
            .set({ memberIds, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id))
            .returning();
        return updated;
    }
    async removeMember(id, userId, memberId) {
        await this.requireRole(userId, 'admin');
        const dept = await this.findOne(id);
        const memberIds = dept.memberIds.filter((m) => m !== memberId);
        const [updated] = await this.db
            .update(departments_schema_1.departments)
            .set({ memberIds, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id))
            .returning();
        return updated;
    }
    async setChannelId(id, channelId) {
        await this.db
            .update(departments_schema_1.departments)
            .set({ channelId })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id));
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        users_service_1.UsersService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map