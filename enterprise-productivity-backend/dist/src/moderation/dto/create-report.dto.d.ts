export declare class CreateReportDto {
    targetType: 'message' | 'user';
    targetMessageId?: string;
    targetUserId?: string;
    channelId: string;
    channelName?: string;
    reason: string;
    description?: string;
}
