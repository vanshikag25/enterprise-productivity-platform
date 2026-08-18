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
const languages_1 = require("../languages");
const roles_1 = require("../rbac/roles");
const audit_service_1 = require("../audit/audit.service");
let UsersService = class UsersService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async findByUsername(username) {
        const [user] = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, username));
        return user;
    }
    async findByEmail(email) {
        const [user] = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, email));
        return user;
    }
    async findAllExcept(username) {
        return this.db.select().from(users_schema_1.users).where((0, drizzle_orm_1.ne)(users_schema_1.users.username, username));
    }
    async count() {
        const [row] = await this.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(users_schema_1.users);
        return row?.n ?? 0;
    }
    async createUser(input) {
        const existing = await this.findByUsername(input.username);
        if (existing) {
            throw new common_1.ConflictException('An account with that username already exists.');
        }
        const existingEmail = await this.findByEmail(input.email);
        if (existingEmail) {
            throw new common_1.ConflictException('An account with that email already exists.');
        }
        const [user] = await this.db
            .insert(users_schema_1.users)
            .values({
            username: input.username,
            email: input.email,
            passwordHash: input.passwordHash,
            firstName: input.firstName ?? null,
            lastName: input.lastName ?? null,
            imageUrl: input.imageUrl ?? null,
            ...(input.role ? { role: input.role } : {}),
        })
            .returning();
        return user;
    }
    async updatePassword(username, passwordHash) {
        const [updated] = await this.db
            .update(users_schema_1.users)
            .set({ passwordHash, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, username))
            .returning();
        if (!updated)
            throw new common_1.ForbiddenException('User profile not found');
        return updated;
    }
    async changeUsername(currentUsername, newUsername) {
        const username = newUsername.trim();
        if (username === currentUsername) {
            throw new common_1.ConflictException('New username is the same as the current one.');
        }
        const existing = await this.findByUsername(username);
        if (existing) {
            throw new common_1.ConflictException('An account with that username already exists.');
        }
        try {
            const [updated] = await this.db
                .update(users_schema_1.users)
                .set({ username, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, currentUsername))
                .returning();
            if (!updated)
                throw new common_1.ForbiddenException('User profile not found');
            return updated;
        }
        catch (err) {
            const reason = err?.code;
            if (reason === '23505') {
                throw new common_1.ConflictException('An account with that username already exists.');
            }
            throw err;
        }
    }
    async removeUser(actor, targetUsername) {
        if (actor.username === targetUsername) {
            throw new common_1.ForbiddenException('You cannot remove your own account.');
        }
        const target = await this.findByUsername(targetUsername);
        if (!target) {
            throw new common_1.ForbiddenException('User not found');
        }
        const [removed] = await this.db
            .delete(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, targetUsername))
            .returning({ username: users_schema_1.users.username });
        if (!removed)
            throw new common_1.ForbiddenException('User not found');
    }
    async updateProfile(username, patch) {
        let preferredLanguage;
        if (patch.preferredLanguage !== undefined) {
            const language = patch.preferredLanguage.trim().toLowerCase();
            if (!(0, languages_1.isSupportedLanguage)(language)) {
                throw new common_1.BadRequestException(`Unsupported preferred language "${patch.preferredLanguage}".`);
            }
            preferredLanguage = language;
        }
        const [updated] = await this.db
            .update(users_schema_1.users)
            .set({
            ...(patch.firstName !== undefined
                ? { firstName: patch.firstName }
                : {}),
            ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
            ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
            ...(preferredLanguage !== undefined ? { preferredLanguage } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, username))
            .returning();
        if (!updated)
            throw new common_1.ForbiddenException('User profile not found');
        return updated;
    }
    async updateRole(actor, targetUsername, newRole) {
        const target = await this.findByUsername(targetUsername);
        if (!target)
            throw new common_1.ForbiddenException('User not found');
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
        return this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(users_schema_1.users)
                .set({ role: newRole, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(users_schema_1.users.username, targetUsername))
                .returning();
            await this.auditService.record({
                actionType: 'role_change',
                actorId: actor.username,
                actorRole: actor.role,
                actorName: [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
                    actor.username,
                targetUserId: target.username,
                targetUserName: [target.firstName, target.lastName].filter(Boolean).join(' ') ||
                    target.username,
                resourceType: 'user',
                resourceId: target.username,
                resourceName: target.username,
                previousValue: { role: target.role },
                newValue: { role: newRole },
                reason: null,
            }, { tx });
            return updated;
        });
    }
    async findUsersPaginated(currentUsername, params) {
        const { search, page, limit, sortBy, sortOrder } = params;
        const baseCondition = (0, drizzle_orm_1.ne)(users_schema_1.users.username, currentUsername);
        const searchTerm = search?.trim();
        const searchCondition = searchTerm
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(users_schema_1.users.username, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)(users_schema_1.users.firstName, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)(users_schema_1.users.lastName, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)(users_schema_1.users.email, `%${searchTerm}%`), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `concat(${users_schema_1.users.firstName}, ' ', ${users_schema_1.users.lastName})`, `%${searchTerm}%`))
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
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        audit_service_1.AuditService])
], UsersService);
//# sourceMappingURL=users.service.js.map