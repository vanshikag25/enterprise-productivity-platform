import { TranslationProvider, TranslationRequest, TranslationResult } from '../translation.provider';
export declare class OpenAiTranslationProvider implements TranslationProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    readonly name = "openai";
    private readonly logger;
    constructor(apiKey: string, baseUrl: string, model: string);
    translate(request: TranslationRequest): Promise<TranslationResult>;
    private parse;
    private systemPrompt;
}
