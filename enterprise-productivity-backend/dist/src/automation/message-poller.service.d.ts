import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { StreamService } from '../stream/stream.service';
import { WorkflowEventBus } from './event-bus/event-bus.service';
export declare class MessagePollerService implements OnModuleInit, OnModuleDestroy {
    private readonly db;
    private readonly configService;
    private readonly streamService;
    private readonly eventBus;
    private readonly logger;
    private timer;
    private readonly cursors;
    private seeded;
    constructor(db: NodePgDatabase, configService: ConfigService, streamService: StreamService, eventBus: WorkflowEventBus);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private poll;
    private allChannelIds;
    private pollChannel;
}
