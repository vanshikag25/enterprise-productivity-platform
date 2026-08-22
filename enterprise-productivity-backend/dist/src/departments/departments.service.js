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
const stream_service_1 = require("../stream/stream.service");
let DepartmentsService = class DepartmentsService {
    constructor(db, usersService, streamService) {
        this.db = db;
        this.usersService = usersService;
        this.streamService = streamService;
    }
    async ensureDepartmentSchema() {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'departments'
          AND column_name = 'manager_id'
      ) AS has_manager_id
    `);
        const rows = (result.rows ?? []);
        const hasManagerId = rows[0]?.has_manager_id;
        const isPresent = hasManagerId === true || hasManagerId === 't' || hasManagerId === 'true' || String(hasManagerId).toLowerCase() === 'true';
        if (!isPresent) {
            await this.db.execute((0, drizzle_orm_1.sql) `
        ALTER TABLE "departments"
        ADD COLUMN IF NOT EXISTS "manager_id" varchar(255)
      `);
        }
    }
    async requireRole(userId, minimum) {
        const user = await this.usersService.findByUsername(userId);
        if (!user || !(0, roles_1.hasMinRole)(user.role, minimum)) {
            throw new common_1.ForbiddenException('Insufficient permissions for this action');
        }
    }
    async syncChannelMembership(dept) {
        if (!dept.channelId)
            return;
        const channel = this.streamService.getClient().channel('messaging', dept.channelId);
        await channel.watch();
        const currentMembers = Object.keys(channel.state.members ?? {});
        const desiredMembers = Array.from(new Set(dept.memberIds ?? []));
        const toAdd = desiredMembers.filter((member) => !currentMembers.includes(member));
        const toRemove = currentMembers.filter((member) => !desiredMembers.includes(member));
        if (toAdd.length)
            await channel.addMembers(toAdd);
        if (toRemove.length)
            await channel.removeMembers(toRemove);
    }
    async create(userId, dto) {
        await this.ensureDepartmentSchema();
        await this.requireRole(userId, 'admin');
        const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));
        const channel = await this.streamService.createGroupChannel(userId, dto.name, dto.description ?? undefined, memberIds);
        const [dept] = await this.db
            .insert(departments_schema_1.departments)
            .values({
            name: dto.name,
            description: dto.description ?? null,
            managerId: null,
            memberIds,
            channelId: channel.id ?? null,
            createdBy: userId,
        })
            .returning();
        if (channel.id) {
            await this.syncChannelMembership({ ...dept, channelId: channel.id });
        }
        return dept;
    }
    async findMine(userId) {
        await this.ensureDepartmentSchema();
        const user = await this.usersService.findByUsername(userId);
        const all = await this.db.select().from(departments_schema_1.departments);
        if (user && (0, roles_1.hasMinRole)(user.role, 'admin'))
            return all;
        return all.filter((d) => d.memberIds.includes(userId));
    }
    async findOne(id) {
        await this.ensureDepartmentSchema();
        const [dept] = await this.db
            .select()
            .from(departments_schema_1.departments)
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id));
        if (!dept)
            throw new common_1.NotFoundException('Department not found');
        return dept;
    }
    async update(id, userId, dto) {
        await this.ensureDepartmentSchema();
        await this.requireRole(userId, 'manager');
        const dept = await this.findOne(id);
        const memberIds = dto.memberIds
            ? Array.from(new Set([...(dept.memberIds ?? []), ...dto.memberIds]))
            : dept.memberIds;
        const [updated] = await this.db
            .update(departments_schema_1.departments)
            .set({
            name: dto.name ?? dept.name,
            description: dto.description ?? dept.description,
            managerId: null,
            memberIds,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id))
            .returning();
        if (updated.channelId) {
            await this.syncChannelMembership(updated);
        }
        return updated;
    }
    async remove(id, userId) {
        await this.ensureDepartmentSchema();
        await this.requireRole(userId, 'admin');
        const dept = await this.findOne(id);
        if (dept.channelId) {
            try {
                const channel = this.streamService.getClient().channel('messaging', dept.channelId);
                await channel.delete();
            }
            catch {
            }
        }
        await this.db.delete(departments_schema_1.departments).where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id));
    }
    async addMember(id, userId, memberId) {
        await this.ensureDepartmentSchema();
        await this.requireRole(userId, 'manager');
        const dept = await this.findOne(id);
        const memberIds = Array.from(new Set([...dept.memberIds, memberId]));
        const [updated] = await this.db
            .update(departments_schema_1.departments)
            .set({ memberIds, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id))
            .returning();
        if (updated.channelId) {
            await this.syncChannelMembership(updated);
        }
        return updated;
    }
    async removeMember(id, userId, memberId) {
        await this.ensureDepartmentSchema();
        await this.requireRole(userId, 'manager');
        const dept = await this.findOne(id);
        const memberIds = dept.memberIds.filter((m) => m !== memberId);
        const [updated] = await this.db
            .update(departments_schema_1.departments)
            .set({ memberIds, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, id))
            .returning();
        if (updated.channelId) {
            await this.syncChannelMembership(updated);
        }
        return updated;
    }
    async setChannelId(id, channelId) {
        await this.ensureDepartmentSchema();
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
        users_service_1.UsersService,
        stream_service_1.StreamService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map