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
exports.ModerationController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_1 = require("../rbac/roles");
const users_service_1 = require("../users/users.service");
const moderation_service_1 = require("./moderation.service");
const create_report_dto_1 = require("./dto/create-report.dto");
const update_report_dto_1 = require("./dto/update-report.dto");
const mute_user_dto_1 = require("./dto/mute-user.dto");
const user_target_dto_1 = require("./dto/user-target.dto");
const ban_user_dto_1 = require("./dto/ban-user.dto");
const lock_channel_dto_1 = require("./dto/lock-channel.dto");
const list_reports_query_dto_1 = require("./dto/list-reports-query.dto");
const list_logs_query_dto_1 = require("./dto/list-logs-query.dto");
function requireUserId(auth) {
    if (!auth.userId) {
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    }
    return auth.userId;
}
let ModerationController = class ModerationController {
    constructor(moderationService, usersService) {
        this.moderationService = moderationService;
        this.usersService = usersService;
    }
    async createReport(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.createReport(actor, dto);
    }
    async listReports(auth, query) {
        const actor = await this.requireActor(auth);
        return this.moderationService.listReports(actor, {
            page: query.page,
            limit: query.limit,
            status: query.status,
        });
    }
    async updateReport(auth, id, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.updateReport(actor, id, dto.action, dto.note);
    }
    async deleteMessage(auth, messageId, body) {
        const actor = await this.requireActor(auth);
        return this.moderationService.deleteMessage(actor, messageId, body?.reason);
    }
    async muteUser(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.muteUser(actor, dto);
    }
    async unmuteUser(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.unmuteUser(actor, dto);
    }
    async removeMember(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.removeMember(actor, dto);
    }
    async banUser(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.banUser(actor, dto);
    }
    async unbanUser(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.unbanUser(actor, dto);
    }
    async lockChannel(auth, dto) {
        const actor = await this.requireActor(auth);
        return this.moderationService.setChannelLock(actor, dto);
    }
    async listLogs(auth, query) {
        const actor = await this.requireActor(auth);
        return this.moderationService.listLogs(actor, {
            page: query.page,
            limit: query.limit,
            actionType: query.actionType,
        });
    }
    async requireActor(auth) {
        const actor = await this.usersService.findByUsername(requireUserId(auth));
        if (!actor)
            throw new common_1.UnauthorizedException('User profile not found');
        return actor;
    }
};
exports.ModerationController = ModerationController;
__decorate([
    (0, common_1.Post)('reports'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_report_dto_1.CreateReportDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "createReport", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_reports_query_dto_1.ListReportsQueryDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "listReports", null);
__decorate([
    (0, common_1.Patch)('reports/:id'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_report_dto_1.UpdateReportDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "updateReport", null);
__decorate([
    (0, common_1.Post)('messages/:id/delete'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Post)('users/mute'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mute_user_dto_1.MuteUserDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "muteUser", null);
__decorate([
    (0, common_1.Post)('users/unmute'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_target_dto_1.UserTargetDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "unmuteUser", null);
__decorate([
    (0, common_1.Post)('users/remove'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.MANAGER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_target_dto_1.UserTargetDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Post)('users/ban'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ban_user_dto_1.BanUserDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "banUser", null);
__decorate([
    (0, common_1.Post)('users/unban'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ban_user_dto_1.BanUserDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "unbanUser", null);
__decorate([
    (0, common_1.Post)('channels/lock'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, lock_channel_dto_1.LockChannelDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "lockChannel", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.TEAM_LEAD),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_logs_query_dto_1.ListLogsQueryDto]),
    __metadata("design:returntype", Promise)
], ModerationController.prototype, "listLogs", null);
exports.ModerationController = ModerationController = __decorate([
    (0, common_1.Controller)('moderation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [moderation_service_1.ModerationService,
        users_service_1.UsersService])
], ModerationController);
//# sourceMappingURL=moderation.controller.js.map