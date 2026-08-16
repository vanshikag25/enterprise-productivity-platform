import { StreamService } from '../stream/stream.service';
import { SmartReplyProvider, SmartReplyResult } from './smart-reply.provider';
export declare class SmartReplyService {
    private readonly streamService;
    private readonly provider;
    private readonly logger;
    constructor(streamService: StreamService, provider: SmartReplyProvider);
    getReplies(channelId: string, userId: string): Promise<SmartReplyResult>;
    private describeChannel;
    private resolveChannel;
    private fetchRecentMessages;
}
