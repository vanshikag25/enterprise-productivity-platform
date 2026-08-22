"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OpenAiTranslationProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiTranslationProvider = void 0;
const common_1 = require("@nestjs/common");
const languages_1 = require("../../languages");
let OpenAiTranslationProvider = OpenAiTranslationProvider_1 = class OpenAiTranslationProvider {
    constructor(apiKey, baseUrl, model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.name = 'gemini';
        this.logger = new common_1.Logger(OpenAiTranslationProvider_1.name);
    }
    async translate(request) {
        const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(this.model)}:generateContent`);
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
                                    `Target language: ${String(request.targetLanguage)} (${(0, languages_1.languageLabel)(request.targetLanguage)})`,
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
            throw new Error(`AI provider request failed (${response.status}): ${body.slice(0, 300)}`);
        }
        const data = (await response.json());
        const content = data.candidates?.[0]?.content?.parts
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
            detectedSourceLanguage: typeof parsed.detectedSourceLanguage === 'string' &&
                parsed.detectedSourceLanguage.trim()
                ? parsed.detectedSourceLanguage.trim()
                : null,
            provider: this.name,
        };
    }
    parse(content) {
        try {
            return JSON.parse(content);
        }
        catch (err) {
            this.logger.warn(`AI provider returned non-JSON content, stripping keys: ${err instanceof Error ? err.message : err}`);
            const stripped = content
                .replace(/^```json\s*/i, '')
                .replace(/```\s*$/, '')
                .trim();
            try {
                return JSON.parse(stripped);
            }
            catch {
                return { translatedText: content.trim() };
            }
        }
    }
    systemPrompt() {
        return [
            'You are a professional translator inside a team messaging app.',
            'Translate the user-provided message into the target language while preserving tone, meaning, and any names or numbers.',
            'Keep formatting inline (lists, quotes) intact as plain text.',
            'Respond with valid JSON only, using this exact shape:',
            '{"detectedSourceLanguage": "<ISO 639-1 code of the source language, or empty string if unknown>", "translatedText": "<the translation>"}.',
            'Output no markdown and no commentary outside the JSON.',
        ].join(' ');
    }
};
exports.OpenAiTranslationProvider = OpenAiTranslationProvider;
exports.OpenAiTranslationProvider = OpenAiTranslationProvider = OpenAiTranslationProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, String])
], OpenAiTranslationProvider);
//# sourceMappingURL=openai-translation.provider.js.map