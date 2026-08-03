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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const users_schema_1 = require("../database/schema/users.schema");
const roles_1 = require("../rbac/roles");
let UsersService = class UsersService {
    constructor(db) {
        this.db = db;
    }
    async superAdminCount() {
        const [row] = await this.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.role, 'super_admin'));
        return row?.n ?? 0;
    }
    async upsertUser(authUser) {
        const roleValue = (await this.superAdminCount()) === 0
            ? 'super_admin'
            : undefined;
        const [user] = await this.db
            .insert(users_schema_1.users)
            .values({
            clerkId: authUser.clerkId,
            email: authUser.email,
            firstName: authUser.firstName ?? null,
            lastName: authUser.lastName ?? null,
            imageUrl: authUser.imageUrl ?? null,
            ...(roleValue ? { role: roleValue } : {}),
        })
            .onConflictDoUpdate({
            target: users_schema_1.users.clerkId,
            set: {
                email: authUser.email,
                firstName: authUser.firstName ?? null,
                lastName: authUser.lastName ?? null,
                imageUrl: authUser.imageUrl ?? null,
                updatedAt: new Date(),
                ...(roleValue ? { role: roleValue } : {}),
            },
        })
            .returning();
        return user;
    }
    async findAllExcept(clerkId) {
        return this.db.select().from(users_schema_1.users).where((0, drizzle_orm_1.ne)(users_schema_1.users.clerkId, clerkId));
    }
    async findByClerkId(clerkId) {
        const [user] = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.clerkId, clerkId));
        return user;
    }
    async updateRole(actor, targetClerkId, newRole) {
        const target = await this.findByClerkId(targetClerkId);
        if (!target)
            throw new common_1.NotFoundException('User not found');
        if (actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            if (newRole === roles_1.UserRole.SUPER_ADMIN ||
                newRole === roles_1.UserRole.ORGANIZATION_OWNER) {
                throw new common_1.ForbiddenException('Only a Super Admin can assign that role');
            }
            if (target.role === roles_1.UserRole.SUPER_ADMIN ||
                target.role === roles_1.UserRole.ORGANIZATION_OWNER) {
                throw new common_1.ForbiddenException("You cannot modify this user's role");
            }
            if (roles_1.ROLE_RANK[target.role] >= roles_1.ROLE_RANK[actor.role]) {
                throw new common_1.ForbiddenException('You cannot modify the role of a user with equal or higher rank');
            }
            if (roles_1.ROLE_RANK[newRole] >= roles_1.ROLE_RANK[actor.role]) {
                throw new common_1.ForbiddenException('You cannot assign a role equal to or higher than your own');
            }
        }
        const [updated] = await this.db
            .update(users_schema_1.users)
            .set({ role: newRole, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.clerkId, targetClerkId))
            .returning();
        return updated;
    }
    async findUsersPaginated(currentClerkId, params) {
        const { search, page, limit, sortBy, sortOrder } = params;
        const baseCondition = (0, drizzle_orm_1.ne)(users_schema_1.users.clerkId, currentClerkId);
        const searchTerm = search?.trim();
        const searchCondition = searchTerm
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(users_schema_1.users.firstName, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)(users_schema_1.users.lastName, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)(users_schema_1.users.email, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `concat(${users_schema_1.users.firstName}, ' ', ${users_schema_1.users.lastName})`, `%${searchTerm}%`))
            : undefined;
        const whereClause = searchCondition
            ? (0, drizzle_orm_1.and)(baseCondition, searchCondition)
            : baseCondition;
        const sortColumnMap = {
            firstName: users_schema_1.users.firstName,
            lastName: users_schema_1.users.lastName,
            email: users_schema_1.users.email,
            createdAt: users_schema_1.users.createdAt,
        };
        const sortColumn = sortColumnMap[sortBy];
        const orderClause = sortOrder === 'desc' ? (0, drizzle_orm_1.desc)(sortColumn) : (0, drizzle_orm_1.asc)(sortColumn);
        const [items, totalResult] = await Promise.all([
            this.db
                .select()
                .from(users_schema_1.users)
                .where(whereClause)
                .orderBy(orderClause)
                .limit(limit)
                .offset((page - 1) * limit),
            this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(users_schema_1.users)
                .where(whereClause),
        ]);
        return { items, total: totalResult[0]?.count ?? 0 };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], UsersService);
//# sourceMappingURL=users.service.js.map