"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWorkflowDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_workflow_dto_1 = require("./create-workflow.dto");
class UpdateWorkflowDto extends (0, mapped_types_1.PartialType)(create_workflow_dto_1.CreateWorkflowDto) {
}
exports.UpdateWorkflowDto = UpdateWorkflowDto;
//# sourceMappingURL=update-workflow.dto.js.map