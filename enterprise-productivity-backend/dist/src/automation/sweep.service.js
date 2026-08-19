"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WorkflowSweepService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSweepService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const tasks_schema_1 = require("../database/schema/tasks.schema");
const project_milestones_schema_1 = require("../database/schema/project-milestones.schema");
const event_bus_service_1 = require("./event-bus/event-bus.service");
const SWEEP_INITIAL_DELAY_MS = 30_000;
let WorkflowSweepService = WorkflowSweepService_1 = class WorkflowSweepService {
    constructor(db, configService, eventBus) {
        this.db = db;
        this.configService = configService;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(WorkflowSweepService_1.name);
        this.timer = null;
    }
    onModuleInit() {
        const intervalMs = this.configService.get('automation.taskSweepIntervalMs') ??
            3_600_000;
        this.timer = setInterval(() => {
            void this.sweep().catch((err) => this.logger.error(`Automation sweep failed: ${err instanceof Error ? err.message : err}`));
        }, intervalMs);
        setTimeout(() => void this.sweep().catch(() => undefined), SWEEP_INITIAL_DELAY_MS);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async sweep() {
        const dayKey = new Date().toISOString().slice(0, 10);
        const now = new Date();
        const overdueTasks = await this.db
            .select()
            .from(tasks_schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(tasks_schema_1.tasks.status, ['Todo', 'In Progress', 'In Review']), (0, drizzle_orm_1.lt)(tasks_schema_1.tasks.dueDate, now)));
        for (const task of overdueTasks) {
            this.eventBus.emit('task_overdue', `task:${task.id}:${dayKey}`, {
                taskId: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                assignee: task.assignee,
                createdBy: task.createdBy,
                channelId: task.streamChannelId,
                dueDate: task.dueDate?.toISOString(),
                projectId: null,
                actor: task.assignee ?? task.createdBy,
            });
        }
        const delayedMilestones = await this.db
            .select()
            .from(project_milestones_schema_1.projectMilestones)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(project_milestones_schema_1.projectMilestones.status, ['planned', 'in_progress']), (0, drizzle_orm_1.lt)(project_milestones_schema_1.projectMilestones.dueDate, now)));
        for (const milestone of delayedMilestones) {
            this.eventBus.emit('milestone_delayed', `milestone:${milestone.id}:${dayKey}`, {
                milestoneId: milestone.id,
                title: milestone.title,
                milestoneStatus: milestone.status,
                milestoneProgress: milestone.progress,
                milestoneDueDate: milestone.dueDate?.toISOString(),
                projectId: milestone.projectId,
                channelId: milestone.streamChannelId,
                actor: milestone.ownerId,
            });
        }
    }
};
exports.WorkflowSweepService = WorkflowSweepService;
exports.WorkflowSweepService = WorkflowSweepService = WorkflowSweepService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        config_1.ConfigService,
        event_bus_service_1.WorkflowEventBus])
], WorkflowSweepService);
//# sourceMappingURL=sweep.service.js.map