import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AutomationService } from './automation.service';
export declare class WorkflowQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly db;
    private readonly configService;
    private readonly automationService;
    private readonly logger;
    private readonly queue;
    private processing;
    private readonly retryTimers;
    constructor(db: NodePgDatabase, configService: ConfigService, automationService: AutomationService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    enqueue(executionId: string): void;
    private scheduleRetry;
    private process;
    private recoverPending;
}
