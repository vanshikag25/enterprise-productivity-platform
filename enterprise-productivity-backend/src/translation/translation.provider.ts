export interface TranslationRequest {
  text: string;
  targetLanguage: string;
}

export interface TranslationResult {
  /** The message text in the target language. */
  translatedText: string;
  /** Best-effort language of the source text (ISO 639-1), when detectable. */
  detectedSourceLanguage: string | null;
  provider: string;
}

export const TRANSLATION_PROVIDER = 'TRANSLATION_PROVIDER';

/**
 * Provider-agnostic contract for message translation. Existing chat behaviour,
 * caching and membership checks live in TranslationService; providers only
 * translate raw text into the requested language.
 */
export interface TranslationProvider {
  readonly name: string;
  translate(request: TranslationRequest): Promise<TranslationResult>;
}