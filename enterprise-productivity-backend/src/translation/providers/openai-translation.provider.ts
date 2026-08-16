import { Injectable, Logger } from '@nestjs/common';
import {
  TranslationProvider,
  TranslationRequest,
  TranslationResult,
} from '../translation.provider';
import { languageLabel } from '../../languages';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * OpenAI-compatible provider for message translation. Used when
 * AI_PROVIDER=openai and OPENAI_API_KEY are configured. Talks to the
 * /chat/completions endpoint via fetch so no extra runtime dependency is
 * needed; OPENAI_BASE_URL can point at any compatible gateway.
 */
@Injectable()
export class OpenAiTranslationProvider implements TranslationProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiTranslationProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.systemPrompt() },
          {
            role: 'user',
            content: [
              `Target language: ${String(request.targetLanguage)} (${languageLabel(request.targetLanguage)})`,
              '',
              'Text to translate:',
              request.text,
            ].join('\n'),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `AI provider request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
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