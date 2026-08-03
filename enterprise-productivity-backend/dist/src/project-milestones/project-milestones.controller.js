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
exports.ProjectMilestonesController = void 0;
const common_1 = require("@nestjs/common");
const clerk_auth_guard_1 = require("../clerk/clerk-auth.guard");
const current_user_decorator_1 = require("../clerk/current-user.decorator");
const project_milestones_service_1 = require("./project-milestones.service");
const create_milestone_dto_1 = require("./dto/create-milestone.dto");
const update_milestone_dto_1 = require("./dto/update-milestone.dto");
const update_milestone_dto_2 = require("./dto/update-milestone.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let ProjectMilestonesController = class ProjectMilestonesController {
    constructor(milestonesService) {
        this.milestonesService = milestonesService;
    }
    findAll(auth, projectId, status, sortBy) {
        return this.milestonesService.findAll(projectId, requireUserId(auth), status, sortBy);
    }
    create(auth, projectId, dto) {
        return this.milestonesService.create(projectId, requireUserId(auth), dto);
    }
    update(auth, projectId, id, dto) {
        return this.milestonesService.update(projectId, requireUserId(auth), id, dto);
    }
    updateStatus(auth, projectId, id, dto) {
        return this.milestonesService.updateStatus(projectId, requireUserId(auth), id, dto.status);
    }
    updateProgress(auth, projectId, id, dto) {
        return this.milestonesService.updateProgress(projectId, requireUserId(auth), id, dto.progress);
    }
    remove(auth, projectId, id) {
        return this.milestonesService.remove(projectId, requireUserId(auth), id);
    }
};
exports.ProjectMilestonesController = ProjectMilestonesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('sortBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectMilestonesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_milestone_dto_1.CreateMilestoneDto]),
    __metadata("design:returntype", void 0)
], ProjectMilestonesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_milestone_dto_1.UpdateMilestoneDto]),
    __metadata("design:returntype", void 0)
], ProjectMilestonesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_milestone_dto_2.UpdateMilestoneStatusDto]),
    __metadata("design:returntype", void 0)
], ProjectMilestonesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_milestone_dto_2.UpdateMilestoneProgressDto]),
    __metadata("design:returntype", void 0)
], ProjectMilestonesController.prototype, "updateProgress", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectMilestonesController.prototype, "remove", null);
exports.ProjectMilestonesController = ProjectMilestonesController = __decorate([
    (0, common_1.Controller)('projects/:projectId/milestones'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [project_milestones_service_1.ProjectMilestonesService])
], ProjectMilestonesController);
//# sourceMappingURL=project-milestones.controller.js.map