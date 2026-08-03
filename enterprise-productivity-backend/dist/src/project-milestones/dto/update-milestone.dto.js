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
exports.UpdateMilestoneProgressDto = exports.UpdateMilestoneStatusDto = exports.UpdateMilestoneDto = void 0;
const class_validator_1 = require("class-validator");
const create_milestone_dto_1 = require("./create-milestone.dto");
class UpdateMilestoneDto {
}
exports.UpdateMilestoneDto = UpdateMilestoneDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "ownerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(create_milestone_dto_1.MILESTONE_STATUSES),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateMilestoneDto.prototype, "progress", void 0);
class UpdateMilestoneStatusDto {
}
exports.UpdateMilestoneStatusDto = UpdateMilestoneStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(create_milestone_dto_1.MILESTONE_STATUSES),
    __metadata("design:type", String)
], UpdateMilestoneStatusDto.prototype, "status", void 0);
class UpdateMilestoneProgressDto {
}
exports.UpdateMilestoneProgressDto = UpdateMilestoneProgressDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateMilestoneProgressDto.prototype, "progress", void 0);
//# sourceMappingURL=update-milestone.dto.js.map