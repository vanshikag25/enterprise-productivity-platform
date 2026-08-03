"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSummaryModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const stream_module_1 = require("../stream/stream.module");
const projects_module_1 = require("../projects/projects.module");
const ai_summary_service_1 = require("./ai-summary.service");
const mock_ai_summary_provider_1 = require("./providers/mock-ai-summary.provider");
const ai_summary_provider_1 = require("./ai-summary.provider");
let AiSummaryModule = class AiSummaryModule {
};
exports.AiSummaryModule = AiSummaryModule;
exports.AiSummaryModule = AiSummaryModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, stream_module_1.StreamModule, projects_module_1.ProjectsModule],
        providers: [
            ai_summary_service_1.AiSummaryService,
            {
                provide: ai_summary_provider_1.AI_SUMMARY_PROVIDER,
                useClass: mock_ai_summary_provider_1.MockAiSummaryProvider,
            },
        ],
        exports: [ai_summary_service_1.AiSummaryService],
    })
], AiSummaryModule);
//# sourceMappingURL=ai-summary.module.js.map