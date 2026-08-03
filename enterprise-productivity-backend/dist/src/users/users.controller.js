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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const clerk_auth_guard_1 = require("../clerk/clerk-auth.guard");
const current_user_decorator_1 = require("../clerk/current-user.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_1 = require("../rbac/roles");
const users_service_1 = require("./users.service");
const stream_service_1 = require("../stream/stream.service");
const list_users_query_dto_1 = require("./dto/list-users-query.dto");
const update_user_role_dto_1 = require("./dto/update-user-role.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let UsersController = class UsersController {
    constructor(usersService, streamService) {
        this.usersService = usersService;
        this.streamService = streamService;
    }
    async me(auth) {
        const user = await this.usersService.findByClerkId(requireUserId(auth));
        if (!user)
            throw new common_1.UnauthorizedException('User profile not found');
        return {
            id: user.clerkId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            imageUrl: user.imageUrl,
            role: user.role,
        };
    }
    async listUsers(auth, query) {
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        const { items, total } = await this.usersService.findUsersPaginated(auth.userId, {
            search: query.search,
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
        const presenceMap = await this.streamService.getUsersPresence(items.map((u) => u.clerkId));
        const usersResponse = items.map((u) => {
            const presence = presenceMap.get(u.clerkId);
            return {
                id: u.clerkId,
                name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
                email: u.email,
                imageUrl: u.imageUrl,
                online: presence?.online ?? false,
                lastSeen: presence?.lastActive ?? null,
                joinedAt: u.createdAt.toISOString(),
                role: u.role,
            };
        });
        return {
            users: usersResponse,
            total,
            page: query.page,
            limit: query.limit,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        };
    }
    async updateRole(auth, clerkId, dto) {
        const actor = await this.usersService.findByClerkId(requireUserId(auth));
        if (!actor)
            throw new common_1.UnauthorizedException('User profile not found');
        const updated = await this.usersService.updateRole(actor, clerkId, dto.role);
        return {
            id: updated.clerkId,
            name: [updated.firstName, updated.lastName].filter(Boolean).join(' ') ||
                updated.email,
            email: updated.email,
            imageUrl: updated.imageUrl,
            role: updated.role,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_users_query_dto_1.ListUsersQueryDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)(':clerkId/role'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('clerkId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_user_role_dto_1.UpdateUserRoleDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRole", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        stream_service_1.StreamService])
], UsersController);
//# sourceMappingURL=users.controller.js.map