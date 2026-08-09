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
exports.ProjectAnnouncementsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const project_announcements_service_1 = require("./project-announcements.service");
const create_announcement_dto_1 = require("./dto/create-announcement.dto");
const update_announcement_dto_1 = require("./dto/update-announcement.dto");
const announcement_actions_dto_1 = require("./dto/announcement-actions.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let ProjectAnnouncementsController = class ProjectAnnouncementsController {
    constructor(announcementsService) {
        this.announcementsService = announcementsService;
    }
    findAll(auth, projectId, q) {
        return this.announcementsService.findAll(projectId, requireUserId(auth), q);
    }
    create(auth, projectId, dto) {
        return this.announcementsService.create(projectId, requireUserId(auth), dto);
    }
    update(auth, projectId, id, dto) {
        return this.announcementsService.update(projectId, requireUserId(auth), id, dto);
    }
    setPinned(auth, projectId, id, dto) {
        return this.announcementsService.setPinned(projectId, requireUserId(auth), id, dto.isPinned);
    }
    remove(auth, projectId, id) {
        return this.announcementsService.remove(projectId, requireUserId(auth), id);
    }
    addReaction(auth, projectId, id, dto) {
        return this.announcementsService.addReaction(projectId, requireUserId(auth), id, dto.emoji);
    }
    removeReaction(auth, projectId, id, emoji) {
        return this.announcementsService.removeReaction(projectId, requireUserId(auth), id, decodeURIComponent(emoji));
    }
};
exports.ProjectAnnouncementsController = ProjectAnnouncementsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_announcement_dto_1.CreateAnnouncementDto]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_announcement_dto_1.UpdateAnnouncementDto]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/pin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, announcement_actions_dto_1.SetPinnedDto]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "setPinned", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/reactions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, announcement_actions_dto_1.AddReactionDto]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)(':id/reactions/:emoji'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Param)('emoji')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ProjectAnnouncementsController.prototype, "removeReaction", null);
exports.ProjectAnnouncementsController = ProjectAnnouncementsController = __decorate([
    (0, common_1.Controller)('projects/:projectId/announcements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [project_announcements_service_1.ProjectAnnouncementsService])
], ProjectAnnouncementsController);
//# sourceMappingURL=project-announcements.controller.js.map