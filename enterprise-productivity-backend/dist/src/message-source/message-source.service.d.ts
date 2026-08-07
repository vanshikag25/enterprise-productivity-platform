import { StreamService } from '../stream/stream.service';
export interface SourceMessageRef {
    sourceChannelId?: string;
    sourceMessageId?: string;
    sourceSenderId?: string;
    sourceChannelName?: string;
}
export interface ConfirmSourceMessageInput {
    channelId: string;
    messageId: string;
    userId: string;
    confirmationText: string;
}
export declare class MessageSourceService {
    private readonly streamService;
    private readonly logger;
    constructor(streamService: StreamService);
    confirmSourceMessage(input: ConfirmSourceMessageInput): Promise<boolean>;
}
