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
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const auth_service_1 = require("../auth/auth.service");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_1 = require("../rbac/roles");
const users_service_1 = require("./users.service");
const stream_service_1 = require("../stream/stream.service");
const list_users_query_dto_1 = require("./dto/list-users-query.dto");
const update_user_role_dto_1 = require("./dto/update-user-role.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const change_username_dto_1 = require("./dto/change-username.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let UsersController = class UsersController {
    constructor(usersService, authService, streamService) {
        this.usersService = usersService;
        this.authService = authService;
        this.streamService = streamService;
    }
    async me(auth) {
        const user = await this.usersService.findByUsername(requireUserId(auth));
        if (!user)
            throw new common_1.UnauthorizedException('User profile not found');
        return this.serializeMe(user);
    }
    async updateMe(auth, dto) {
        const user = await this.usersService.updateProfile(requireUserId(auth), dto);
        return this.serializeMe(user);
    }
    serializeMe(user) {
        return {
            id: user.username,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
            email: user.email,
            imageUrl: user.imageUrl,
            role: user.role,
            preferredLanguage: user.preferredLanguage,
            status: user.status,
            createdAt: user.createdAt.toISOString(),
        };
    }
    async updateMyStatus(auth, dto) {
        const user = await this.usersService.updateStatus(requireUserId(auth), dto.status);
        await this.streamService.setUserStatus(user.username, user.status);
        return this.serializeMe(user);
    }
    async changePassword(auth, dto) {
        const username = requireUserId(auth);
        await this.authService.changePassword(username, dto.currentPassword, dto.newPassword);
        return { id: username, updated: true };
    }
    async changeUsername(auth, dto) {
        const username = requireUserId(auth);
        const updated = await this.usersService.changeUsername(username, dto.username);
        return this.authService.issueSession(updated);
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
        const presenceMap = await this.streamService.getUsersPresence(items.map((u) => u.username));
        const usersResponse = items.map((u) => {
            const presence = presenceMap.get(u.username);
            return {
                id: u.username,
                name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
                email: u.email,
                imageUrl: u.imageUrl,
                online: presence?.online ?? false,
                lastSeen: presence?.lastActive ?? null,
                status: u.status,
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
    async updateRole(auth, username, dto) {
        const actor = await this.usersService.findByUsername(requireUserId(auth));
        if (!actor)
            throw new common_1.UnauthorizedException('User profile not found');
        const updated = await this.usersService.updateRole(actor, username, dto.role);
        return {
            id: updated.username,
            name: [updated.firstName, updated.lastName].filter(Boolean).join(' ') ||
                updated.email,
            email: updated.email,
            imageUrl: updated.imageUrl,
            role: updated.role,
        };
    }
    async removeUser(auth, username) {
        const actor = await this.usersService.findByUsername(requireUserId(auth));
        if (!actor)
            throw new common_1.UnauthorizedException('User profile not found');
        await this.usersService.removeUser(actor, username);
        return { id: username, removed: true };
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
    (0, common_1.Patch)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Patch)('me/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_status_dto_1.UpdateStatusDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMyStatus", null);
__decorate([
    (0, common_1.Post)('me/password'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('me/username'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_username_dto_1.ChangeUsernameDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changeUsername", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_users_query_dto_1.ListUsersQueryDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)(':username/role'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('username')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_user_role_dto_1.UpdateUserRoleDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)(':username'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.SUPER_ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeUser", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        auth_service_1.AuthService,
        stream_service_1.StreamService])
], UsersController);
//# sourceMappingURL=users.controller.js.map