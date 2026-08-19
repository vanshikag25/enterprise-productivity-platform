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
var WorkflowQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowQueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const workflows_schema_1 = require("../database/schema/workflows.schema");
const automation_service_1 = require("./automation.service");
let WorkflowQueueService = WorkflowQueueService_1 = class WorkflowQueueService {
    constructor(db, configService, automationService) {
        this.db = db;
        this.configService = configService;
        this.automationService = automationService;
        this.logger = new common_1.Logger(WorkflowQueueService_1.name);
        this.queue = [];
        this.processing = false;
        this.retryTimers = new Map();
    }
    onModuleInit() {
        void this.recoverPending().catch((err) => this.logger.error(`Failed to recover pending executions: ${err}`));
    }
    onModuleDestroy() {
        for (const timer of this.retryTimers.values()) {
            clearTimeout(timer);
        }
        this.retryTimers.clear();
    }
    enqueue(executionId) {
        this.queue.push(executionId);
        void this.process();
    }
    scheduleRetry(executionId, retryCount) {
        const base = this.configService.get('automation.retryBackoffMs') ?? 5_000;
        const delay = base * 2 ** (retryCount - 1);
        this.logger.warn(`Execution ${executionId} will be retried (attempt ${retryCount}) in ${delay}ms`);
        const timer = setTimeout(() => {
            this.retryTimers.delete(executionId);
            this.enqueue(executionId);
        }, delay);
        this.retryTimers.set(executionId, timer);
    }
    async process() {
        if (this.processing)
            return;
        this.processing = true;
        try {
            while (this.queue.length > 0) {
                const executionId = this.queue.shift();
                if (!executionId)
                    continue;
                try {
                    const result = await this.automationService.executeExecution(executionId);
                    if (result?.status === 'retried') {
                        this.scheduleRetry(executionId, result.retryCount);
                    }
                }
                catch (err) {
                    this.logger.error(`Execution ${executionId} crashed: ${err instanceof Error ? err.message : err}`);
                }
            }
        }
        finally {
            this.processing = false;
        }
    }
    async recoverPending() {
        const rows = await this.db
            .select({ id: workflows_schema_1.workflowExecutions.id })
            .from(workflows_schema_1.workflowExecutions)
            .where((0, drizzle_orm_1.inArray)(workflows_schema_1.workflowExecutions.status, ['pending', 'retried']))
            .limit(200);
        for (const row of rows) {
            this.enqueue(row.id);
        }
        if (rows.length > 0) {
            this.logger.log(`Re-queued ${rows.length} pending workflow executions.`);
        }
    }
};
exports.WorkflowQueueService = WorkflowQueueService;
exports.WorkflowQueueService = WorkflowQueueService = WorkflowQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        config_1.ConfigService,
        automation_service_1.AutomationService])
], WorkflowQueueService);
//# sourceMappingURL=queue.service.js.map