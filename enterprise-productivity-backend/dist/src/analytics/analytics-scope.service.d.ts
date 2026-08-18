import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type User } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import type { AnalyticsScope } from './analytics.types';
export interface AnalyticsAccess {
    scope: AnalyticsScope;
    channelIds: string[] | null;
    actor: User;
}
export declare class AnalyticsScopeService {
    private readonly db;
    private readonly streamService;
    private readonly logger;
    constructor(db: NodePgDatabase, streamService: StreamService);
    private isPlatformRole;
    resolve(actor: User): Promise<AnalyticsAccess>;
    managedChannelIds(actor: User): Promise<string[]>;
    requireUser(username: string): Promise<User>;
}
