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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_1 = require("../rbac/roles");
const analytics_service_1 = require("./analytics.service");
const analytics_query_dto_1 = require("./dto/analytics-query.dto");
function requireUserId(auth) {
    if (!auth.userId) {
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    }
    return auth.userId;
}
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async overview(auth, query) {
        return this.analyticsService.overview(requireUserId(auth), query);
    }
    async messages(auth, query) {
        return this.analyticsService.messagesDetail(requireUserId(auth), query);
    }
    async users(auth, query) {
        return this.analyticsService.usersDetail(requireUserId(auth), query);
    }
    async channels(auth, query) {
        return this.analyticsService.channelsDetail(requireUserId(auth), query);
    }
    async teams(auth, query) {
        return this.analyticsService.teamsDetail(requireUserId(auth), query);
    }
    async storage(auth, query) {
        return this.analyticsService.storageDetail(requireUserId(auth), query);
    }
    async ai(auth, query) {
        return this.analyticsService.aiDetail(requireUserId(auth), query);
    }
    async moderation(auth, query) {
        return this.analyticsService.moderationDetail(requireUserId(auth), query);
    }
    async responseTime(auth, query) {
        return this.analyticsService.responseTimeDetail(requireUserId(auth), query);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "messages", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "users", null);
__decorate([
    (0, common_1.Get)('channels'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "channels", null);
__decorate([
    (0, common_1.Get)('teams'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "teams", null);
__decorate([
    (0, common_1.Get)('storage'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "storage", null);
__decorate([
    (0, common_1.Get)('ai'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "ai", null);
__decorate([
    (0, common_1.Get)('moderation'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "moderation", null);
__decorate([
    (0, common_1.Get)('response-time'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_query_dto_1.AnalyticsDetailQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "responseTime", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.MANAGER),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map