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
exports.ProjectDocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const clerk_auth_guard_1 = require("../clerk/clerk-auth.guard");
const current_user_decorator_1 = require("../clerk/current-user.decorator");
const project_documents_service_1 = require("./project-documents.service");
const document_storage_1 = require("./document-storage");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let ProjectDocumentsController = class ProjectDocumentsController {
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    upload(auth, projectId, file) {
        return this.documentsService.upload(projectId, requireUserId(auth), file);
    }
    findAll(auth, projectId, q) {
        return this.documentsService.findAll(projectId, requireUserId(auth), q);
    }
    download(auth, projectId, id, res) {
        return this.documentsService.getFile(projectId, requireUserId(auth), id, res, false);
    }
    preview(auth, projectId, id, res) {
        return this.documentsService.getFile(projectId, requireUserId(auth), id, res, true);
    }
    remove(auth, projectId, id) {
        return this.documentsService.remove(projectId, requireUserId(auth), id);
    }
};
exports.ProjectDocumentsController = ProjectDocumentsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: document_storage_1.documentStorage,
        limits: { fileSize: document_storage_1.MAX_FILE_SIZE_BYTES },
        fileFilter: document_storage_1.documentFileFilter,
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectDocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectDocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectDocumentsController.prototype, "download", null);
__decorate([
    (0, common_1.Get)(':id/preview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectDocumentsController.prototype, "preview", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectDocumentsController.prototype, "remove", null);
exports.ProjectDocumentsController = ProjectDocumentsController = __decorate([
    (0, common_1.Controller)('projects/:projectId/documents'),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [project_documents_service_1.ProjectDocumentsService])
], ProjectDocumentsController);
//# sourceMappingURL=project-documents.controller.js.map