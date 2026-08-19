import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { WorkflowEventBus } from './event-bus/event-bus.service';
export declare class WorkflowSweepService implements OnModuleInit, OnModuleDestroy {
    private readonly db;
    private readonly configService;
    private readonly eventBus;
    private readonly logger;
    private timer;
    constructor(db: NodePgDatabase, configService: ConfigService, eventBus: WorkflowEventBus);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private sweep;
}
