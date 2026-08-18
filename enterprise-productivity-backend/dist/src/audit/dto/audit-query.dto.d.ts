export declare const AUDIT_SORTS: readonly ["newest", "oldest"];
export declare class AuditListQueryDto {
    page?: number;
    limit?: number;
    actionType?: string;
    actorId?: string;
    channelId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sort?: 'newest' | 'oldest';
}
