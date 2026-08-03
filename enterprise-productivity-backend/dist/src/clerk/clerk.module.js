"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkModule = void 0;
const common_1 = require("@nestjs/common");
const clerk_service_1 = require("./clerk.service");
const clerk_auth_guard_1 = require("./clerk-auth.guard");
const clerk_test_controller_1 = require("./clerk-test.controller");
const stream_controller_1 = require("../stream/stream.controller");
const users_controller_1 = require("../users/users.controller");
const chat_controller_1 = require("../chat/chat.controller");
const chat_service_1 = require("../chat/chat.service");
const tasks_controller_1 = require("../tasks/tasks.controller");
const meetings_controller_1 = require("../meetings/meetings.controller");
const departments_controller_1 = require("../departments/departments.controller");
const channels_controller_1 = require("../channels/channels.controller");
const notifications_controller_1 = require("../notifications/notifications.controller");
const roles_guard_1 = require("../rbac/roles.guard");
const users_module_1 = require("../users/users.module");
const stream_module_1 = require("../stream/stream.module");
const tasks_module_1 = require("../tasks/tasks.module");
const meetings_module_1 = require("../meetings/meetings.module");
const departments_module_1 = require("../departments/departments.module");
const channels_module_1 = require("../channels/channels.module");
const notifications_module_1 = require("../notifications/notifications.module");
const database_module_1 = require("../database/database.module");
const projects_module_1 = require("../projects/projects.module");
const project_announcements_module_1 = require("../project-announcements/project-announcements.module");
const project_documents_module_1 = require("../project-documents/project-documents.module");
const project_milestones_module_1 = require("../project-milestones/project-milestones.module");
const ai_summary_module_1 = require("../ai-summary/ai-summary.module");
const projects_controller_1 = require("../projects/projects.controller");
const project_announcements_controller_1 = require("../project-announcements/project-announcements.controller");
const project_documents_controller_1 = require("../project-documents/project-documents.controller");
const project_milestones_controller_1 = require("../project-milestones/project-milestones.controller");
const ai_summary_controller_1 = require("../ai-summary/ai-summary.controller");
let ClerkModule = class ClerkModule {
};
exports.ClerkModule = ClerkModule;
exports.ClerkModule = ClerkModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            stream_module_1.StreamModule,
            tasks_module_1.TasksModule,
            meetings_module_1.MeetingsModule,
            departments_module_1.DepartmentsModule,
            channels_module_1.ChannelsModule,
            notifications_module_1.NotificationsModule,
            database_module_1.DatabaseModule,
            projects_module_1.ProjectsModule,
            project_announcements_module_1.ProjectAnnouncementsModule,
            project_documents_module_1.ProjectDocumentsModule,
            project_milestones_module_1.ProjectMilestonesModule,
            ai_summary_module_1.AiSummaryModule,
        ],
        controllers: [
            clerk_test_controller_1.ClerkTestController,
            stream_controller_1.StreamController,
            users_controller_1.UsersController,
            chat_controller_1.ChatController,
            tasks_controller_1.TasksController,
            meetings_controller_1.MeetingsController,
            departments_controller_1.DepartmentsController,
            channels_controller_1.ChannelsController,
            notifications_controller_1.NotificationsController,
            projects_controller_1.ProjectsController,
            project_announcements_controller_1.ProjectAnnouncementsController,
            project_documents_controller_1.ProjectDocumentsController,
            project_milestones_controller_1.ProjectMilestonesController,
            ai_summary_controller_1.AiSummaryController,
        ],
        providers: [clerk_service_1.ClerkService, clerk_auth_guard_1.ClerkAuthGuard, chat_service_1.ChatService, roles_guard_1.RolesGuard],
        exports: [clerk_service_1.ClerkService, clerk_auth_guard_1.ClerkAuthGuard, roles_guard_1.RolesGuard],
    })
], ClerkModule);
//# sourceMappingURL=clerk.module.js.map