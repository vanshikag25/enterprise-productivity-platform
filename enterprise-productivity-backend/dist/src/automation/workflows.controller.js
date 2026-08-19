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
exports.WorkflowsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const roles_guard_1 = require("../rbac/roles.guard");
const roles_decorator_1 = require("../rbac/roles.decorator");
const roles_1 = require("../rbac/roles");
const automation_service_1 = require("./automation.service");
const queue_service_1 = require("./queue.service");
const create_workflow_dto_1 = require("./dto/create-workflow.dto");
const update_workflow_dto_1 = require("./dto/update-workflow.dto");
const workflow_query_dto_1 = require("./dto/workflow-query.dto");
function requireUserId(auth) {
    if (!auth.userId)
        throw new common_1.UnauthorizedException('Session has no resolvable userId');
    return auth.userId;
}
let WorkflowsController = class WorkflowsController {
    constructor(automationService, workflowQueue) {
        this.automationService = automationService;
        this.workflowQueue = workflowQueue;
    }
    meta() {
        return this.automationService.meta();
    }
    findAll() {
        return this.automationService.findAll();
    }
    create(auth, dto) {
        return this.automationService.create({ userId: requireUserId(auth) }, dto);
    }
    findOne(id) {
        return this.automationService.findOne(id);
    }
    update(auth, id, dto) {
        return this.automationService.update({ userId: requireUserId(auth) }, id, dto);
    }
    remove(auth, id) {
        return this.automationService.remove({ userId: requireUserId(auth) }, id);
    }
    toggle(auth, id, dto) {
        return this.automationService.toggle({ userId: requireUserId(auth) }, id, dto.enabled);
    }
    listExecutions(id, query) {
        return this.automationService.listExecutions(id, query);
    }
    async retryExecution(auth, executionId) {
        const execution = await this.automationService.retryExecution({ userId: requireUserId(auth) }, executionId);
        this.workflowQueue.enqueue(execution.id);
        return execution;
    }
};
exports.WorkflowsController = WorkflowsController;
__decorate([
    (0, common_1.Get)('meta'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "meta", null);
__decorate([
    (0, common_1.Get)('workflows'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('workflows'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_workflow_dto_1.CreateWorkflowDto]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('workflows/:id'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('workflows/:id'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_workflow_dto_1.UpdateWorkflowDto]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('workflows/:id'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('workflows/:id/toggle'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, workflow_query_dto_1.ToggleWorkflowDto]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "toggle", null);
__decorate([
    (0, common_1.Get)('workflows/:id/executions'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, workflow_query_dto_1.ExecutionsQueryDto]),
    __metadata("design:returntype", void 0)
], WorkflowsController.prototype, "listExecutions", null);
__decorate([
    (0, common_1.Post)('workflows/executions/:executionId/retry'),
    (0, roles_decorator_1.Roles)(roles_1.UserRole.ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('executionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkflowsController.prototype, "retryExecution", null);
exports.WorkflowsController = WorkflowsController = __decorate([
    (0, common_1.Controller)('automation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [automation_service_1.AutomationService,
        queue_service_1.WorkflowQueueService])
], WorkflowsController);
//# sourceMappingURL=workflows.controller.js.map