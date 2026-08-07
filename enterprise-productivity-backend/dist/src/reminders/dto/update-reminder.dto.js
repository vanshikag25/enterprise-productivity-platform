"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateReminderDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_reminder_dto_1 = require("./create-reminder.dto");
class UpdateReminderDto extends (0, mapped_types_1.PartialType)(create_reminder_dto_1.CreateReminderDto) {
}
exports.UpdateReminderDto = UpdateReminderDto;
//# sourceMappingURL=update-reminder.dto.js.map