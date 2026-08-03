"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDocumentsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const projects_module_1 = require("../projects/projects.module");
const project_documents_service_1 = require("./project-documents.service");
let ProjectDocumentsModule = class ProjectDocumentsModule {
};
exports.ProjectDocumentsModule = ProjectDocumentsModule;
exports.ProjectDocumentsModule = ProjectDocumentsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, projects_module_1.ProjectsModule],
        providers: [project_documents_service_1.ProjectDocumentsService],
        exports: [project_documents_service_1.ProjectDocumentsService],
    })
], ProjectDocumentsModule);
//# sourceMappingURL=project-documents.module.js.map