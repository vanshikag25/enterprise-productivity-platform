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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_1 = require("../rbac/roles");
const users_service_1 = require("../users/users.service");
const audit_service_1 = require("./audit.service");
const audit_query_dto_1 = require("./dto/audit-query.dto");
function requireUserId(auth) {
    if (!auth.userId) {
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    }
    return auth.userId;
}
let AuditController = class AuditController {
    constructor(auditService, usersService) {
        this.auditService = auditService;
        this.usersService = usersService;
    }
    async listLogs(auth, query) {
        const actor = await this.usersService.findByUsername(requireUserId(auth));
        if (!actor) {
            throw new common_1.UnauthorizedException('User profile not found');
        }
        return this.auditService.listLogs(actor, {
            page: query.page ?? 1,
            limit: query.limit ?? 25,
            actionType: query.actionType,
            actorId: query.actorId,
            channelId: query.channelId,
            search: query.search,
            startDate: query.startDate,
            endDate: query.endDate,
            sort: query.sort ?? 'newest',
        });
    }
    actionTypes() {
        return { items: this.auditService.actionTypes() };
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, audit_query_dto_1.AuditListQueryDto]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "listLogs", null);
__decorate([
    (0, common_1.Get)('actions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "actionTypes", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.Controller)('audit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        users_service_1.UsersService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map