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
var OpenAiActionDetectionProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiActionDetectionProvider = void 0;
const common_1 = require("@nestjs/common");
const action_detection_provider_1 = require("../action-detection.provider");
let OpenAiActionDetectionProvider = OpenAiActionDetectionProvider_1 = class OpenAiActionDetectionProvider {
    constructor(apiKey, baseUrl, model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.name = 'gemini';
        this.logger = new common_1.Logger(OpenAiActionDetectionProvider_1.name);
    }
    async detect(context) {
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
                contents: [{ role: 'user', parts: [{ text: this.buildPrompt(context) }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 400,
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
        const actions = this.parse(content);
        return { actions, provider: this.name };
    }
    parse(content) {
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch {
            this.logger.warn(`AI provider returned non-JSON content for action detection: ${content.slice(0, 200)}`);
            return [];
        }
        if (!Array.isArray(parsed.actions))
            return [];
        const seen = new Set();
        const valid = [];
        for (const item of parsed.actions) {
            const intentType = this.normalizeIntent(item.intentType);
            if (!intentType)
                continue;
            if (seen.has(intentType))
                continue;
            seen.add(intentType);
            const title = String(item.title ?? '').trim();
            if (!title)
                continue;
            valid.push({
                intentType,
                title: title.slice(0, 512),
                summary: String(item.summary ?? '')
                    .trim()
                    .slice(0, 1024),
                confidence: typeof item.confidence === 'number'
                    ? Math.min(1, Math.max(0, Math.round(item.confidence * 100) / 100))
                    : 0.7,
                meta: item.meta ?? {},
            });
        }
        return valid;
    }
    normalizeIntent(value) {
        if (typeof value !== 'string')
            return null;
        const normalized = value
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
        const match = action_detection_provider_1.AI_DETECTED_INTENTS.find((i) => i === normalized);
        return match ?? null;
    }
    buildPrompt(context) {
        const { message } = context;
        return [
            `Channel: ${context.channelName ?? context.channelId}`,
            `Channel id: ${context.channelId}`,
            '',
            `Message from ${message.user ?? message.userId ?? 'Unknown'}:`,
            message.text,
            '',
            'Analyse this single message and produce the action detection JSON now.',
        ].join('\n');
    }
    systemPrompt() {
        return [
            'You analyse chat messages in a professional messaging app and detect',
            'actionable intents so the product can offer one-tap actions.',
            '',
            'Detect ONLY these intent types: task, meeting, deadline, reminder,',
            'decision, follow_up.',
            '',
            'Respond with valid JSON only, using this exact shape:',
            '{"actions":[{"intentType":"task","title":"...","summary":"...","confidence":0.9,"meta":{}}]}.',
            '',
            'Rules:',
            '- Return an empty actions array when nothing is actionable.',
            '- Return at most ONE action per intent type, and at most 3 total.',
            '- title: a short, human-readable label (<=80 chars) using extracted',
            '  information, e.g. "Create task: migration report" or "Follow up with client".',
            '- confidence: 0..1 reflecting how sure you are.',
            '- meta: extract structured fields to pre-fill forms. Allowed keys:',
            '  title, description, dueDate (ISO), scheduledFor (ISO), scheduledDate (ISO),',
            '  startTime (HH:mm), endTime (HH:mm), priority, assignee, participants',
            '  (array of names/ids), decision, notes.',
            '- Only fill meta keys that are actually present in the message text.',
            '- Do NOT invent people, dates, or facts that are not in the message.',
        ].join('\n');
    }
};
exports.OpenAiActionDetectionProvider = OpenAiActionDetectionProvider;
exports.OpenAiActionDetectionProvider = OpenAiActionDetectionProvider = OpenAiActionDetectionProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, String])
], OpenAiActionDetectionProvider);
//# sourceMappingURL=openai-action-detection.provider.js.map