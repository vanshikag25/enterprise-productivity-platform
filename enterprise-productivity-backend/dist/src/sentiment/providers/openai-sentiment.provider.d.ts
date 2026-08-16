import { SentimentContext, SentimentProvider, SentimentResult } from '../sentiment.provider';
export declare class OpenAiSentimentProvider implements SentimentProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    readonly name = "openai";
    private readonly logger;
    constructor(apiKey: string, baseUrl: string, model: string);
    analyze(context: SentimentContext): Promise<SentimentResult>;
    private normalize;
    private normalizeTrend;
    private labelForScore;
    private buildPrompt;
    private systemPrompt;
}
