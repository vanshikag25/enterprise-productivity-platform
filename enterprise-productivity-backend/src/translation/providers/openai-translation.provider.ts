import { Injectable, Logger } from '@nestjs/common';
import {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from '../translation.provider';
import { languageLabel } from '../../languages';

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Gemini-backed provider for message translation. Used when
 * AI_PROVIDER=gemini and GEMINI_API_KEY are configured.
 */
@Injectable()
export class OpenAiTranslationProvider implements TranslationProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(OpenAiTranslationProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const url = new URL(
      `${this.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(this.model)}:generateContent`,
    );
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: this.systemPrompt() }],
        },
        contents: [{
          role: 'user',
          parts: [{ text: [
            `Target language: ${String(request.targetLanguage)} (${languageLabel(request.targetLanguage)})`,
            '',
            'Text to translate:',
            request.text,
          ].join('\n') }],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `AI provider request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as GeminiGenerateResponse;
    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? '';
    if (!content) {
      throw new Error('AI provider returned an empty response');
    }

    const parsed = this.parse(content);
    const translatedText = String(parsed.translatedText ?? '').trim();
    if (!translatedText) {
      throw new Error('AI provider returned no translation');
    }

    return {
      translatedText,
      detectedSourceLanguage:
        typeof parsed.detectedSourceLanguage === 'string' &&
        parsed.detectedSourceLanguage.trim()
          ? parsed.detectedSourceLanguage.trim()
          : null,
      provider: this.name,
    };
  }

  private parse(content: string): { translatedText?: unknown; detectedSourceLanguage?: unknown } {
    try {
      return JSON.parse(content) as {
        translatedText?: unknown;
        detectedSourceLanguage?: unknown;
      };
    } catch (err) {
      this.logger.warn(
        `AI provider returned non-JSON content, stripping keys: ${
          err instanceof Error ? err.message : err
        }`,
      );
      const stripped = content
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
      try {
        return JSON.parse(stripped) as {
          translatedText?: unknown;
          detectedSourceLanguage?: unknown;
        };
      } catch {
        return { translatedText: content.trim() };
      }
    }
  }

  private systemPrompt(): string {
    return [
      'You are a professional translator inside a team messaging app.',
      'Translate the user-provided message into the target language while preserving tone, meaning, and any names or numbers.',
      'Keep formatting inline (lists, quotes) intact as plain text.',
      'Respond with valid JSON only, using this exact shape:',
      '{"detectedSourceLanguage": "<ISO 639-1 code of the source language, or empty string if unknown>", "translatedText": "<the translation>"}.',
      'Output no markdown and no commentary outside the JSON.',
    ].join(' ');
  }
}