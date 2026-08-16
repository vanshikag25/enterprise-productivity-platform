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
exports.ActionDetectionController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const detect_actions_dto_1 = require("./dto/detect-actions.dto");
const resolve_action_dto_1 = require("./dto/resolve-action.dto");
const action_detection_service_1 = require("./action-detection.service");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let ActionDetectionController = class ActionDetectionController {
    constructor(actionDetectionService) {
        this.actionDetectionService = actionDetectionService;
    }
    analyze(auth, dto) {
        return this.actionDetectionService.analyze(dto.channelId, requireUserId(auth), dto.messageId);
    }
    list(auth, channelId) {
        if (!channelId)
            throw new common_1.UnauthorizedException('channelId is required');
        return this.actionDetectionService.list(channelId, requireUserId(auth));
    }
    findOne(auth, id) {
        return this.actionDetectionService.findOne(id, requireUserId(auth));
    }
    dismiss(auth, id) {
        return this.actionDetectionService.dismiss(id, requireUserId(auth));
    }
    resolve(auth, id, dto) {
        return this.actionDetectionService.resolve(id, requireUserId(auth), dto);
    }
};
exports.ActionDetectionController = ActionDetectionController;
__decorate([
    (0, common_1.Post)('analyze'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, detect_actions_dto_1.DetectActionsDto]),
    __metadata("design:returntype", Promise)
], ActionDetectionController.prototype, "analyze", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('channelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ActionDetectionController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ActionDetectionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/dismiss'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ActionDetectionController.prototype, "dismiss", null);
__decorate([
    (0, common_1.Post)(':id/resolve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, resolve_action_dto_1.ResolveActionDto]),
    __metadata("design:returntype", Promise)
], ActionDetectionController.prototype, "resolve", null);
exports.ActionDetectionController = ActionDetectionController = __decorate([
    (0, common_1.Controller)('chat/action-detection'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [action_detection_service_1.ActionDetectionService])
], ActionDetectionController);
//# sourceMappingURL=action-detection.controller.js.map