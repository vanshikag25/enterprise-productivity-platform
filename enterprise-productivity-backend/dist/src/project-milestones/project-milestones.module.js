"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMilestonesModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const notifications_module_1 = require("../notifications/notifications.module");
const projects_module_1 = require("../projects/projects.module");
const project_milestones_service_1 = require("./project-milestones.service");
let ProjectMilestonesModule = class ProjectMilestonesModule {
};
exports.ProjectMilestonesModule = ProjectMilestonesModule;
exports.ProjectMilestonesModule = ProjectMilestonesModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, stream_module_1.StreamModule, notifications_module_1.NotificationsModule, projects_module_1.ProjectsModule],
        providers: [project_milestones_service_1.ProjectMilestonesService],
        exports: [project_milestones_service_1.ProjectMilestonesService],
    })
], ProjectMilestonesModule);
//# sourceMappingURL=project-milestones.module.js.map