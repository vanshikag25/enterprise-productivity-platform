"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LANGUAGE_CODES = exports.SUPPORTED_LANGUAGES = void 0;
exports.isSupportedLanguage = isSupportedLanguage;
exports.languageLabel = languageLabel;
exports.SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ru', label: 'Russian' },
    { code: 'zh', label: 'Chinese (Simplified)' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'ar', label: 'Arabic' },
    { code: 'nl', label: 'Dutch' },
    { code: 'tr', label: 'Turkish' },
    { code: 'sv', label: 'Swedish' },
    { code: 'pl', label: 'Polish' },
    { code: 'bn', label: 'Bengali' },
    { code: 'te', label: 'Telugu' },
    { code: 'ta', label: 'Tamil' },
];
exports.SUPPORTED_LANGUAGE_CODES = new Set(exports.SUPPORTED_LANGUAGES.map((l) => l.code));
function isSupportedLanguage(code) {
    return exports.SUPPORTED_LANGUAGE_CODES.has(code);
}
function languageLabel(code) {
    return exports.SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
//# sourceMappingURL=languages.js.map