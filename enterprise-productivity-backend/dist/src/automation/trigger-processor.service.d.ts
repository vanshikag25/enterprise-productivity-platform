import { OnModuleInit } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { WorkflowEventBus } from './event-bus/event-bus.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { WorkflowQueueService } from './queue.service';
export declare class WorkflowTriggerProcessor implements OnModuleInit {
    private readonly db;
    private readonly eventBus;
    private readonly queue;
    private readonly conditionEvaluator;
    private readonly logger;
    constructor(db: NodePgDatabase, eventBus: WorkflowEventBus, queue: WorkflowQueueService, conditionEvaluator: ConditionEvaluatorService);
    onModuleInit(): void;
    private handle;
    private matchesConfig;
}
