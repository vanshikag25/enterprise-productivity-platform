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
var OpenAiSentimentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiSentimentProvider = void 0;
const common_1 = require("@nestjs/common");
const MAX_POSITIVES = 5;
const MAX_FRUSTRATIONS = 10;
const MAX_BLOCKERS = 10;
function asNumber(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return fallback;
}
function clampScore(value) {
    return Math.min(1, Math.max(0, value));
}
let OpenAiSentimentProvider = OpenAiSentimentProvider_1 = class OpenAiSentimentProvider {
    constructor(apiKey, baseUrl, model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.name = 'openai';
        this.logger = new common_1.Logger(OpenAiSentimentProvider_1.name);
    }
    async analyze(context) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                temperature: 0.1,
                max_tokens: 1200,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: this.systemPrompt() },
                    { role: 'user', content: this.buildPrompt(context) },
                ],
            }),
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`AI provider request failed (${response.status}): ${body.slice(0, 300)}`);
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('AI provider returned an empty response');
        }
        let raw;
        try {
            raw = JSON.parse(content);
        }
        catch {
            this.logger.warn(`AI provider returned non-JSON content, falling back: ${content.slice(0, 200)}`);
            raw = {};
        }
        return this.normalize(context, raw);
    }
    normalize(context, raw) {
        const byId = new Map(context.messages.map((m) => [m.id, m]));
        const resolve = (list) => {
            if (!Array.isArray(list))
                return [];
            const items = [];
            for (const item of list) {
                if (!item || typeof item !== 'object')
                    continue;
                const ref = item;
                if (typeof ref.messageId !== 'string')
                    continue;
                const message = byId.get(ref.messageId);
                if (!message)
                    continue;
                items.push({
                    message,
                    confidence: clampScore(asNumber(ref.confidence, 0.7)),
                    category: 'neutral',
                });
            }
            return items;
        };
        const positives = resolve(raw.positives).slice(0, MAX_POSITIVES);
        const frustrations = resolve(raw.frustrations).slice(0, MAX_FRUSTRATIONS);
        const blockers = resolve(raw.blockers).slice(0, MAX_BLOCKERS);
        const toInsight = (items, category) => items.map(({ message, confidence }) => ({
            messageId: message.id,
            userId: message.userId,
            userName: message.userName,
            text: message.text,
            createdAt: message.createdAt,
            category,
            confidence,
        }));
        const signalCount = positives.length + frustrations.length;
        const score = signalCount === 0
            ? 0.5
            : clampScore(Math.round((positives.length / signalCount) * 100) / 100);
        const rawOverall = (raw.overall ?? {});
        const label = typeof rawOverall.label === 'string' && rawOverall.label.trim()
            ? rawOverall.label.trim().slice(0, 60)
            : this.labelForScore(score);
        const trend = this.normalizeTrend(raw.trend);
        return {
            provider: this.name,
            analyzedCount: context.messages.filter((m) => m.text.trim()).length,
            overall: { label, score },
            positives: toInsight(positives, 'positive'),
            frustrations: toInsight(frustrations, 'frustration'),
            blockers: toInsight(blockers, 'blocker'),
            trend,
        };
    }
    normalizeTrend(rawTrend) {
        if (!Array.isArray(rawTrend))
            return [];
        const seen = new Set();
        const points = [];
        for (const item of rawTrend) {
            if (!item || typeof item !== 'object')
                continue;
            const point = item;
            if (typeof point.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.date))
                continue;
            if (seen.has(point.date))
                continue;
            seen.add(point.date);
            points.push({
                date: point.date,
                positive: Math.max(0, Math.floor(asNumber(point.positive, 0))),
                frustration: Math.max(0, Math.floor(asNumber(point.frustration, 0))),
                neutral: Math.max(0, Math.floor(asNumber(point.neutral, 0))),
            });
        }
        return points.sort((a, b) => a.date.localeCompare(b.date));
    }
    labelForScore(score) {
        if (score >= 0.7)
            return 'Mostly positive';
        if (score >= 0.55)
            return 'Slightly positive';
        if (score <= 0.3)
            return 'Frustrated';
        if (score <= 0.45)
            return 'Slightly frustrated';
        return 'Balanced';
    }
    buildPrompt(context) {
        const transcript = context.messages
            .map((m) => {
            const speaker = m.userName || m.userId || 'Unknown';
            return `[${m.id}] ${speaker} (${m.createdAt ?? ''}): ${m.text}`;
        })
            .join('\n');
        return [
            `Project: ${context.projectName} (${context.projectId})`,
            `Channel: ${context.channelId}`,
            `Analyzed window: ${context.windowStart} to ${context.windowEnd}`,
            `Message count: ${context.messages.length}`,
            '',
            'Transcript (each line carries the original message id):',
            transcript || '(no messages)',
            '',
            'Produce the sentiment JSON now.',
        ].join('\n');
    }
    systemPrompt() {
        return [
            'You analyze chat messages from a project channel and report team',
            'sentiment for managers.',
            '',
            'Respond with valid JSON only in this exact shape:',
            '{"overall": {"label": string, "score": number},',
            ' "positives": [{"messageId": string, "confidence": number}],',
            ' "frustrations": [{"messageId": string, "confidence": number}],',
            ' "blockers": [{"messageId": string, "confidence": number}],',
            ' "trend": [{"date": "YYYY-MM-DD", "positive": number, "frustration": number, "neutral": number}]}',
            '',
            'Rules:',
            '- For each message pick ONE category: positive, frustration, blocker, or',
            '  neutral. A blocker is a message that reports being blocked/stuck/waiting',
            '  on something or a failure/risk that halts progress. Frustration covers',
            '  discontent with work/processes. Positive covers praise, thanks, and',
            '  progress wins. Everything else is neutral.',
            '- Fill positives/frustrations/blockers with REFERENCES ONLY: reference the',
            '  exact messageId from the transcript, never rewrite the text.',
            '- positivity is any message you classified positive; frustration any you',
            '  classified frustration.',
            '- overall.score is the share of signal that is positive, 0..1.',
            '- trend groups messages by local day across the window; include every day',
            '  that had at least one message (fill counts clamped to integers >= 0).',
            '- confidence is 0..1 reflecting how strongly the message matches the',
            '  category.',
            'Return only the JSON object, nothing else.',
        ].join('\n');
    }
};
exports.OpenAiSentimentProvider = OpenAiSentimentProvider;
exports.OpenAiSentimentProvider = OpenAiSentimentProvider = OpenAiSentimentProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, String])
], OpenAiSentimentProvider);
//# sourceMappingURL=openai-sentiment.provider.js.map