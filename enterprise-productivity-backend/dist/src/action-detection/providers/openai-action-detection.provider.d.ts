import { ActionDetectionContext, ActionDetectionProvider, ActionDetectionResult } from '../action-detection.provider';
export declare class OpenAiActionDetectionProvider implements ActionDetectionProvider {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly model;
    readonly name = "gemini";
    private readonly logger;
    constructor(apiKey: string, baseUrl: string, model: string);
    detect(context: ActionDetectionContext): Promise<ActionDetectionResult>;
    private parse;
    private normalizeIntent;
    private buildPrompt;
    private systemPrompt;
}
