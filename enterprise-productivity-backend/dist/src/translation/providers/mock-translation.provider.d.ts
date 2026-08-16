import { TranslationProvider, TranslationRequest, TranslationResult } from '../translation.provider';
export declare class MockTranslationProvider implements TranslationProvider {
    readonly name = "mock";
    translate(request: TranslationRequest): Promise<TranslationResult>;
    private detectSourceLanguage;
    private applyDictionary;
    private escapeRegExp;
}
