import { SmartReplyContext, SmartReplyProvider, SmartReplyResult } from '../smart-reply.provider';
export declare class OpenAiSmartReplyProvider implements SmartReplyProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    readonly name = "openai";
    private readonly logger;
    constructor(apiKey: string, baseUrl: string, model: string);
    generate(context: SmartReplyContext): Promise<SmartReplyResult>;
    private parse;
    private buildPrompt;
    private systemPrompt;
}
