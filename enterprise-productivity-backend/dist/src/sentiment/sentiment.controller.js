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
exports.SentimentController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const sentiment_service_1 = require("./sentiment.service");
let SentimentController = class SentimentController {
    constructor(sentimentService) {
        this.sentimentService = sentimentService;
    }
    uid(auth) {
        if (!auth.userId) {
            throw new common_1.UnauthorizedException('Session has no resolvable userId');
        }
        return auth.userId;
    }
    async status() {
        return { enabled: await this.sentimentService.getEnabled() };
    }
    async setStatus(auth, body) {
        if (typeof body.enabled !== 'boolean') {
            throw new common_1.BadRequestException('enabled must be a boolean.');
        }
        const enabled = await this.sentimentService.setEnabled(this.uid(auth), body.enabled);
        return { enabled };
    }
    async analyze(auth, body) {
        if (typeof body.projectId !== 'string' || body.projectId.trim() === '') {
            throw new common_1.BadRequestException('projectId is required.');
        }
        let days = 14;
        if (body.days !== undefined) {
            if (typeof body.days !== 'number' || !Number.isFinite(body.days)) {
                throw new common_1.BadRequestException('days must be a number.');
            }
            days = Math.min(90, Math.max(1, Math.floor(body.days)));
        }
        return this.sentimentService.analyzeProject(this.uid(auth), body.projectId.trim(), days);
    }
};
exports.SentimentController = SentimentController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SentimentController.prototype, "status", null);
__decorate([
    (0, common_1.Put)('status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SentimentController.prototype, "setStatus", null);
__decorate([
    (0, common_1.Post)('analyze'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SentimentController.prototype, "analyze", null);
exports.SentimentController = SentimentController = __decorate([
    (0, common_1.Controller)('sentiment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('manager'),
    __metadata("design:paramtypes", [sentiment_service_1.SentimentService])
], SentimentController);
//# sourceMappingURL=sentiment.controller.js.map