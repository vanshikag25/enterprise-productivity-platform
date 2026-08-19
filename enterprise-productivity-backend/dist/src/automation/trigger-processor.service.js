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
var WorkflowTriggerProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowTriggerProcessor = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const workflows_schema_1 = require("../database/schema/workflows.schema");
const event_bus_service_1 = require("./event-bus/event-bus.service");
const condition_evaluator_service_1 = require("./condition-evaluator.service");
const queue_service_1 = require("./queue.service");
const string_utils_1 = require("./string-utils");
let WorkflowTriggerProcessor = WorkflowTriggerProcessor_1 = class WorkflowTriggerProcessor {
    constructor(db, eventBus, queue, conditionEvaluator) {
        this.db = db;
        this.eventBus = eventBus;
        this.queue = queue;
        this.conditionEvaluator = conditionEvaluator;
        this.logger = new common_1.Logger(WorkflowTriggerProcessor_1.name);
    }
    onModuleInit() {
        for (const triggerType of workflows_schema_1.workflowTriggerTypeEnum.enumValues) {
            this.eventBus.subscribe(triggerType, (event) => void this.handle(event).catch((err) => this.logger.error(`Failed to process ${triggerType} event: ${err instanceof Error ? err.message : err}`)));
        }
    }
    async handle(event) {
        const workflows = await this.db
            .select()
            .from(workflows_schema_1.automationWorkflows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.triggerType, event.triggerType), (0, drizzle_orm_1.eq)(workflows_schema_1.automationWorkflows.enabled, true)));
        for (const workflow of workflows) {
            try {
                if (!this.matchesConfig(workflow, event))
                    continue;
                const conditionsMatch = await this.conditionEvaluator.evaluate(workflow.conditions, event.payload);
                if (!conditionsMatch)
                    continue;
                const [row] = await this.db
                    .insert(workflows_schema_1.workflowExecutions)
                    .values({
                    workflowId: workflow.id,
                    triggerType: event.triggerType,
                    eventKey: event.eventKey,
                    triggerData: event.payload,
                })
                    .onConflictDoNothing({
                    target: [
                        workflows_schema_1.workflowExecutions.workflowId,
                        workflows_schema_1.workflowExecutions.eventKey,
                    ],
                })
                    .returning();
                if (!row)
                    continue;
                this.queue.enqueue(row.id);
            }
            catch (err) {
                this.logger.warn(`Workflow ${workflow.id} skipped for event ${event.eventKey}: ${err instanceof Error ? err.message : err}`);
            }
        }
    }
    matchesConfig(workflow, event) {
        const config = workflow.triggerConfig ?? {};
        for (const key of Object.keys(config)) {
            const expected = config[key];
            if (expected === null || expected === undefined || expected === '') {
                continue;
            }
            const actual = event.payload[key];
            if ((0, string_utils_1.toDisplayString)(actual) !== (0, string_utils_1.toDisplayString)(expected))
                return false;
        }
        return true;
    }
};
exports.WorkflowTriggerProcessor = WorkflowTriggerProcessor;
exports.WorkflowTriggerProcessor = WorkflowTriggerProcessor = WorkflowTriggerProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        event_bus_service_1.WorkflowEventBus,
        queue_service_1.WorkflowQueueService,
        condition_evaluator_service_1.ConditionEvaluatorService])
], WorkflowTriggerProcessor);
//# sourceMappingURL=trigger-processor.service.js.map