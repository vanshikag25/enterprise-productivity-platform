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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWorkflowDto = exports.WorkflowActionDto = exports.WorkflowConditionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const workflows_schema_1 = require("../../database/schema/workflows.schema");
class WorkflowConditionDto {
}
exports.WorkflowConditionDto = WorkflowConditionDto;
__decorate([
    (0, class_validator_1.IsIn)(workflows_schema_1.WORKFLOW_CONDITION_FIELDS),
    __metadata("design:type", String)
], WorkflowConditionDto.prototype, "field", void 0);
__decorate([
    (0, class_validator_1.IsIn)(workflows_schema_1.WORKFLOW_CONDITION_OPERATORS),
    __metadata("design:type", String)
], WorkflowConditionDto.prototype, "operator", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkflowConditionDto.prototype, "value", void 0);
class WorkflowActionDto {
}
exports.WorkflowActionDto = WorkflowActionDto;
__decorate([
    (0, class_validator_1.IsIn)(workflows_schema_1.WORKFLOW_ACTION_TYPES),
    __metadata("design:type", String)
], WorkflowActionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkflowActionDto.prototype, "config", void 0);
class CreateWorkflowDto {
}
exports.CreateWorkflowDto = CreateWorkflowDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateWorkflowDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWorkflowDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsIn)(workflows_schema_1.workflowTriggerTypeEnum.enumValues),
    __metadata("design:type", String)
], CreateWorkflowDto.prototype, "triggerType", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateWorkflowDto.prototype, "triggerConfig", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => WorkflowConditionDto),
    __metadata("design:type", Array)
], CreateWorkflowDto.prototype, "conditions", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => WorkflowActionDto),
    __metadata("design:type", Array)
], CreateWorkflowDto.prototype, "actions", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateWorkflowDto.prototype, "enabled", void 0);
//# sourceMappingURL=create-workflow.dto.js.map