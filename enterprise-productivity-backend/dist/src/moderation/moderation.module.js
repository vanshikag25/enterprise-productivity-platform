"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const users_module_1 = require("../users/users.module");
const projects_module_1 = require("../projects/projects.module");
const notifications_module_1 = require("../notifications/notifications.module");
const moderation_service_1 = require("./moderation.service");
const moderation_controller_1 = require("./moderation.controller");
let ModerationModule = class ModerationModule {
};
exports.ModerationModule = ModerationModule;
exports.ModerationModule = ModerationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            stream_module_1.StreamModule,
            users_module_1.UsersModule,
            projects_module_1.ProjectsModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [moderation_service_1.ModerationService],
        controllers: [moderation_controller_1.ModerationController],
    })
], ModerationModule);
//# sourceMappingURL=moderation.module.js.map