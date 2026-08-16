import type { AuthObject } from '../auth/auth-object';
import { SmartReplyService } from './smart-reply.service';
import { GenerateSmartRepliesDto } from './dto/generate-smart-replies.dto';
export declare class SmartReplyController {
    private readonly smartReplyService;
    constructor(smartReplyService: SmartReplyService);
    generate(auth: AuthObject, dto: GenerateSmartRepliesDto): Promise<import("./smart-reply.provider").SmartReplyResult>;
}
