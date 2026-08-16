import { ConversationSummaryContext, ConversationSummaryProvider, ConversationSummaryResult } from '../conversation-summary.provider';
export declare class MockConversationSummaryProvider implements ConversationSummaryProvider {
    readonly name = "mock";
    generate(context: ConversationSummaryContext): Promise<ConversationSummaryResult>;
    private shorten;
}
