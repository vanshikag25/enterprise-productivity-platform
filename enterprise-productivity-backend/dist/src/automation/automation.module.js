"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const users_module_1 = require("../users/users.module");
const stream_module_1 = require("../stream/stream.module");
const tasks_module_1 = require("../tasks/tasks.module");
const notifications_module_1 = require("../notifications/notifications.module");
const reminders_module_1 = require("../reminders/reminders.module");
const project_milestones_module_1 = require("../project-milestones/project-milestones.module");
const conversation_summary_module_1 = require("../conversation-summary/conversation-summary.module");
const ai_summary_module_1 = require("../ai-summary/ai-summary.module");
const projects_module_1 = require("../projects/projects.module");
const automation_service_1 = require("./automation.service");
const queue_service_1 = require("./queue.service");
const trigger_processor_service_1 = require("./trigger-processor.service");
const sweep_service_1 = require("./sweep.service");
const message_poller_service_1 = require("./message-poller.service");
const condition_evaluator_service_1 = require("./condition-evaluator.service");
const action_executor_service_1 = require("./action-executor.service");
const workflows_controller_1 = require("./workflows.controller");
let AutomationModule = class AutomationModule {
};
exports.AutomationModule = AutomationModule;
exports.AutomationModule = AutomationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            users_module_1.UsersModule,
            stream_module_1.StreamModule,
            tasks_module_1.TasksModule,
            notifications_module_1.NotificationsModule,
            reminders_module_1.RemindersModule,
            project_milestones_module_1.ProjectMilestonesModule,
            conversation_summary_module_1.ConversationSummaryModule,
            ai_summary_module_1.AiSummaryModule,
            projects_module_1.ProjectsModule,
        ],
        providers: [
            automation_service_1.AutomationService,
            queue_service_1.WorkflowQueueService,
            trigger_processor_service_1.WorkflowTriggerProcessor,
            sweep_service_1.WorkflowSweepService,
            message_poller_service_1.MessagePollerService,
            condition_evaluator_service_1.ConditionEvaluatorService,
            action_executor_service_1.ActionExecutorService,
        ],
        controllers: [workflows_controller_1.WorkflowsController],
        exports: [automation_service_1.AutomationService],
    })
], AutomationModule);
//# sourceMappingURL=automation.module.js.map