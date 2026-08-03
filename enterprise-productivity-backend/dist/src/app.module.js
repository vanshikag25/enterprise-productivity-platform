"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_module_1 = require("./config/config.module");
const health_module_1 = require("./health/health.module");
const clerk_module_1 = require("./clerk/clerk.module");
const database_module_1 = require("./database/database.module");
const users_module_1 = require("./users/users.module");
const stream_module_1 = require("./stream/stream.module");
const tasks_module_1 = require("./tasks/tasks.module");
const meetings_module_1 = require("./meetings/meetings.module");
const departments_module_1 = require("./departments/departments.module");
const channels_module_1 = require("./channels/channels.module");
const notifications_module_1 = require("./notifications/notifications.module");
const projects_module_1 = require("./projects/projects.module");
const project_announcements_module_1 = require("./project-announcements/project-announcements.module");
const project_documents_module_1 = require("./project-documents/project-documents.module");
const project_milestones_module_1 = require("./project-milestones/project-milestones.module");
const ai_summary_module_1 = require("./ai-summary/ai-summary.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            health_module_1.HealthModule,
            clerk_module_1.ClerkModule,
            database_module_1.DatabaseModule,
            users_module_1.UsersModule,
            stream_module_1.StreamModule,
            tasks_module_1.TasksModule,
            meetings_module_1.MeetingsModule,
            departments_module_1.DepartmentsModule,
            channels_module_1.ChannelsModule,
            notifications_module_1.NotificationsModule,
            projects_module_1.ProjectsModule,
            project_announcements_module_1.ProjectAnnouncementsModule,
            project_documents_module_1.ProjectDocumentsModule,
            project_milestones_module_1.ProjectMilestonesModule,
            ai_summary_module_1.AiSummaryModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map