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
exports.CreationRequestsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const creation_requests_service_1 = require("./creation-requests.service");
const create_creation_request_dto_1 = require("./dto/create-creation-request.dto");
const review_creation_request_dto_1 = require("./dto/review-creation-request.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let CreationRequestsController = class CreationRequestsController {
    constructor(creationRequestsService) {
        this.creationRequestsService = creationRequestsService;
    }
    create(auth, dto) {
        return this.creationRequestsService.create(requireUserId(auth), dto);
    }
    findAll(auth, entityType) {
        const filter = entityType === 'task' || entityType === 'meeting'
            ? entityType
            : undefined;
        return this.creationRequestsService.findAll(requireUserId(auth), filter);
    }
    findOne(auth, id) {
        return this.creationRequestsService.findOne(id, requireUserId(auth));
    }
    approve(auth, id, dto) {
        return this.creationRequestsService.approve(id, requireUserId(auth), dto);
    }
    reject(auth, id, dto) {
        return this.creationRequestsService.reject(id, requireUserId(auth), dto);
    }
};
exports.CreationRequestsController = CreationRequestsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_creation_request_dto_1.CreateCreationRequestDto]),
    __metadata("design:returntype", Promise)
], CreationRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('entityType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CreationRequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CreationRequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_creation_request_dto_1.ReviewCreationRequestDto]),
    __metadata("design:returntype", Promise)
], CreationRequestsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_creation_request_dto_1.ReviewCreationRequestDto]),
    __metadata("design:returntype", Promise)
], CreationRequestsController.prototype, "reject", null);
exports.CreationRequestsController = CreationRequestsController = __decorate([
    (0, common_1.Controller)('creation-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [creation_requests_service_1.CreationRequestsService])
], CreationRequestsController);
//# sourceMappingURL=creation-requests.controller.js.map