"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreationRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const tasks_module_1 = require("../tasks/tasks.module");
const meetings_module_1 = require("../meetings/meetings.module");
const notifications_module_1 = require("../notifications/notifications.module");
const users_module_1 = require("../users/users.module");
const stream_module_1 = require("../stream/stream.module");
const creation_requests_service_1 = require("./creation-requests.service");
const creation_requests_controller_1 = require("./creation-requests.controller");
let CreationRequestsModule = class CreationRequestsModule {
};
exports.CreationRequestsModule = CreationRequestsModule;
exports.CreationRequestsModule = CreationRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            tasks_module_1.TasksModule,
            meetings_module_1.MeetingsModule,
            notifications_module_1.NotificationsModule,
            users_module_1.UsersModule,
            stream_module_1.StreamModule,
        ],
        controllers: [creation_requests_controller_1.CreationRequestsController],
        providers: [creation_requests_service_1.CreationRequestsService],
        exports: [creation_requests_service_1.CreationRequestsService],
    })
], CreationRequestsModule);
//# sourceMappingURL=creation-requests.module.js.map