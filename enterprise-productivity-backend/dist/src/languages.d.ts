export declare const SUPPORTED_LANGUAGES: {
    code: string;
    label: string;
}[];
export declare const SUPPORTED_LANGUAGE_CODES: Set<string>;
export declare function isSupportedLanguage(code: string): boolean;
export declare function languageLabel(code: string): string;
