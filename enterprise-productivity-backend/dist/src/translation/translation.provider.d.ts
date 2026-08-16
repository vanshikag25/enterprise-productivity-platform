export interface TranslationRequest {
    text: string;
    targetLanguage: string;
}
export interface TranslationResult {
    translatedText: string;
    detectedSourceLanguage: string | null;
    provider: string;
}
export declare const TRANSLATION_PROVIDER = "TRANSLATION_PROVIDER";
export interface TranslationProvider {
    readonly name: string;
    translate(request: TranslationRequest): Promise<TranslationResult>;
}
