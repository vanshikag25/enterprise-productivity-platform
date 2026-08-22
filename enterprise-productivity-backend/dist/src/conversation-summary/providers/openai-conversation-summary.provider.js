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
var OpenAiConversationSummaryProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiConversationSummaryProvider = void 0;
const common_1 = require("@nestjs/common");
let OpenAiConversationSummaryProvider = OpenAiConversationSummaryProvider_1 = class OpenAiConversationSummaryProvider {
    constructor(apiKey, baseUrl, model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.name = 'gemini';
        this.logger = new common_1.Logger(OpenAiConversationSummaryProvider_1.name);
    }
    async generate(context) {
        const prompt = this.buildPrompt(context);
        const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(this.model)}:generateContent`);
        url.searchParams.set('key', this.apiKey);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{
                            text: 'You summarize workplace chat conversations. Respond with valid JSON only, using this exact shape: ' +
                                '{"overview": string, "keyDecisions": string[], "actionItems": string[], "unresolvedTopics": string[]}. ' +
                                'Keep overview under 3 sentences; each array item must be a concise bullet. ' +
                                'If a category has nothing, return an empty array.',
                        }],
                },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
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
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch {
            this.logger.warn(`AI provider returned non-JSON content, falling back to text: ${content.slice(0, 200)}`);
            parsed = { overview: content };
        }
        return {
            overview: this.asString(parsed.overview),
            keyDecisions: this.asStringArray(parsed.keyDecisions),
            actionItems: this.asStringArray(parsed.actionItems),
            unresolvedTopics: this.asStringArray(parsed.unresolvedTopics),
            generatedAt: new Date().toISOString(),
            provider: this.name,
        };
    }
    buildPrompt(context) {
        const periodLabel = context.periodType === 'daily'
            ? 'today'
            : context.periodType === 'weekly'
                ? 'this week'
                : 'the full conversation';
        const transcript = context.messages
            .map((m) => `${m.user}: ${m.text}`)
            .join('\n');
        return [
            `Channel: ${context.channelName ?? context.channelId}`,
            `Members: ${context.memberCount}`,
            `Period: ${periodLabel} (${context.periodStart} to ${context.periodEnd})`,
            `Message count: ${context.messages.length}`,
            '',
            'Transcript:',
            transcript || '(no messages in this period)',
            '',
            'Produce the summary JSON now.',
        ].join('\n');
    }
    asString(value) {
        return typeof value === 'string' ? value : '';
    }
    asStringArray(value) {
        if (!Array.isArray(value))
            return [];
        return value.map((item) => typeof item === 'string' ? item : String(item ?? ''));
    }
};
exports.OpenAiConversationSummaryProvider = OpenAiConversationSummaryProvider;
exports.OpenAiConversationSummaryProvider = OpenAiConversationSummaryProvider = OpenAiConversationSummaryProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, String])
], OpenAiConversationSummaryProvider);
//# sourceMappingURL=openai-conversation-summary.provider.js.map