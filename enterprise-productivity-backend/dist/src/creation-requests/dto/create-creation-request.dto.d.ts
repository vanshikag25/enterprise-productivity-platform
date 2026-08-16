export declare class CreateCreationRequestDto {
    entityType: 'task' | 'meeting';
    payload: Record<string, unknown>;
    sourceChannelId?: string;
    sourceMessageId?: string;
    sourceSenderId?: string;
    sourceChannelName?: string;
    sourceMessageText?: string;
}
