import { ConversationSummaryContext, ConversationSummaryProvider, ConversationSummaryResult } from '../conversation-summary.provider';
export declare class OpenAiConversationSummaryProvider implements ConversationSummaryProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    readonly name = "openai";
    private readonly logger;
    constructor(apiKey: string, baseUrl: string, model: string);
    generate(context: ConversationSummaryContext): Promise<ConversationSummaryResult>;
    private buildPrompt;
    private asString;
    private asStringArray;
}
