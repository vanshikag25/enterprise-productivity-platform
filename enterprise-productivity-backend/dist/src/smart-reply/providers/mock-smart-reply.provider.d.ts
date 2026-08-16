import { SmartReplyContext, SmartReplyProvider, SmartReplyResult } from '../smart-reply.provider';
export declare class MockSmartReplyProvider implements SmartReplyProvider {
    readonly name = "mock";
    generate(context: SmartReplyContext): Promise<SmartReplyResult>;
    private classify;
    private newestIndexFor;
    private buildPool;
    private shorten;
}
