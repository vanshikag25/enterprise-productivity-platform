"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectAnnouncementsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const notifications_module_1 = require("../notifications/notifications.module");
const projects_module_1 = require("../projects/projects.module");
const project_announcements_service_1 = require("./project-announcements.service");
let ProjectAnnouncementsModule = class ProjectAnnouncementsModule {
};
exports.ProjectAnnouncementsModule = ProjectAnnouncementsModule;
exports.ProjectAnnouncementsModule = ProjectAnnouncementsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, notifications_module_1.NotificationsModule, projects_module_1.ProjectsModule],
        providers: [project_announcements_service_1.ProjectAnnouncementsService],
        exports: [project_announcements_service_1.ProjectAnnouncementsService],
    })
], ProjectAnnouncementsModule);
//# sourceMappingURL=project-announcements.module.js.map