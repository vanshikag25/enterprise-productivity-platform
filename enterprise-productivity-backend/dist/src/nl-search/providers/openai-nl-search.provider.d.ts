import { NlSearchContext, NlSearchProvider, NlSearchProviderResult } from '../nl-search.provider';
export declare class OpenAiNlSearchProvider implements NlSearchProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    readonly name = "gemini";
    private readonly logger;
    constructor(apiKey: string, baseUrl: string, model: string);
    parse(context: NlSearchContext): Promise<NlSearchProviderResult>;
    private normalize;
    private buildPrompt;
    private systemPrompt;
}
