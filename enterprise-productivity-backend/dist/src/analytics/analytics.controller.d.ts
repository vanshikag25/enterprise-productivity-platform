import type { AuthObject } from '../auth/auth-object';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDetailQueryDto, AnalyticsQueryDto } from './dto/analytics-query.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    overview(auth: AuthObject, query: AnalyticsQueryDto): Promise<import("./analytics.types").AnalyticsOverview>;
    messages(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").MessagesDetail>;
    users(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").UsersDetail>;
    channels(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").ChannelsDetail>;
    teams(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").TeamsDetail>;
    storage(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").StorageDetail>;
    ai(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").AiDetail>;
    moderation(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").ModerationDetail>;
    responseTime(auth: AuthObject, query: AnalyticsDetailQueryDto): Promise<import("./analytics.types").ResponseTimeDetail>;
}
