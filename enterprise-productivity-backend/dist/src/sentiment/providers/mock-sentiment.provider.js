"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSentimentProvider = void 0;
const common_1 = require("@nestjs/common");
const POSITIVE_HINTS = [
    'great',
    'awesome',
    'amazing',
    'excellent',
    'thanks',
    'thank you',
    'appreciate',
    'love it',
    'nice work',
    'good job',
    'well done',
    'impressive',
    'looks good',
    'sounds good',
    'perfect',
    'on track',
    'ahead of schedule',
    'happy',
    'excited',
    'glad',
    'love',
    'fantastic',
    'solid',
    'ship it',
    'rock',
];
const FRUSTRATION_HINTS = [
    'frustrat',
    'annoy',
    'disappoint',
    'tired of',
    'sick of',
    'fed up',
    'not happy',
    'unhappy',
    'ugh',
    'hate',
    'burnt out',
    'burnout',
    'overwhelmed',
    'stress',
    'angry',
    'ridiculous',
    'unfair',
    'too much',
    'crazy',
    'this is hard',
];
const BLOCKER_HINTS = [
    'blocked',
    'blocking',
    'blocker',
    'stuck',
    'waiting on',
    'waiting for',
    'can\'t proceed',
    'cannot proceed',
    'need help',
    'need input',
    'need access',
    'no access',
    'permission denied',
    'is failing',
    'failing',
    'broken',
    'broken build',
    'down',
    'urgent',
    'asap',
    'at risk',
    'risk of delay',
    'blocked on',
    'dependency',
    'not able to',
    'unable to',
];
function classify(textLower) {
    const blockHits = BLOCKER_HINTS.filter((h) => textLower.includes(h)).length;
    const posHits = POSITIVE_HINTS.filter((h) => textLower.includes(h)).length;
    const frustHits = FRUSTRATION_HINTS.filter((h) => textLower.includes(h)).length;
    if (blockHits > 0) {
        return { category: 'blocker', confidence: Math.min(0.95, 0.6 + blockHits * 0.12) };
    }
    if (posHits > 0 && posHits >= frustHits) {
        return { category: 'positive', confidence: Math.min(0.9, 0.55 + posHits * 0.1) };
    }
    if (frustHits > 0) {
        return { category: 'frustration', confidence: Math.min(0.88, 0.55 + frustHits * 0.1) };
    }
    return { category: 'neutral', confidence: 0.5 };
}
function dayKey(iso) {
    if (!iso)
        return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return null;
    return d.toISOString().slice(0, 10);
}
function overallLabel(score) {
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
let MockSentimentProvider = class MockSentimentProvider {
    constructor() {
        this.name = 'mock';
    }
    async analyze(context) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const messages = context.messages.filter((m) => m.text.trim().length > 0);
        const classified = messages.map((m) => {
            const { category, confidence } = classify(m.text.toLowerCase());
            return { ...m, category, confidence };
        });
        const positives = classified
            .filter((m) => m.category === 'positive')
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        const frustrations = classified
            .filter((m) => m.category === 'frustration')
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        const blockers = classified
            .filter((m) => m.category === 'blocker')
            .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        const signalCount = positives.length + frustrations.length;
        const rawScore = signalCount === 0 ? 0.5 : positives.length / signalCount;
        const score = Math.round(rawScore * 100) / 100;
        const trendMap = new Map();
        for (const m of classified) {
            const key = dayKey(m.createdAt);
            if (!key)
                continue;
            const entry = trendMap.get(key) ?? { positive: 0, frustration: 0, neutral: 0 };
            entry[m.category === 'positive' ? 'positive' : m.category === 'frustration' ? 'frustration' : 'neutral'] += 1;
            trendMap.set(key, entry);
        }
        const trend = [...trendMap.entries()]
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));
        const toInsight = (items) => items.map((m) => ({
            messageId: m.id,
            userId: m.userId,
            userName: m.userName,
            text: m.text,
            createdAt: m.createdAt,
            category: m.category,
            confidence: m.confidence,
        }));
        return {
            provider: this.name,
            analyzedCount: messages.length,
            overall: { label: overallLabel(score), score },
            positives: toInsight(positives),
            frustrations: toInsight(frustrations),
            blockers: toInsight(blockers),
            trend,
        };
    }
};
exports.MockSentimentProvider = MockSentimentProvider;
exports.MockSentimentProvider = MockSentimentProvider = __decorate([
    (0, common_1.Injectable)()
], MockSentimentProvider);
//# sourceMappingURL=mock-sentiment.provider.js.map