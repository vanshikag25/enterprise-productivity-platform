export declare const ANALYTICS_RANGES: readonly ["7", "14", "30", "90", "180"];
export declare class AnalyticsQueryDto {
    range?: string;
    startDate?: string;
    endDate?: string;
    teamId?: string;
    departmentId?: string;
    channelId?: string;
}
export declare class AnalyticsDetailQueryDto extends AnalyticsQueryDto {
    limit?: number;
    offset?: number;
}
