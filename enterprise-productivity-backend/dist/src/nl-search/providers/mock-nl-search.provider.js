"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockNlSearchProvider = void 0;
const common_1 = require("@nestjs/common");
const date_utils_1 = require("../date-utils");
const STOP_WORDS = new Set([
    'about', 'show', 'find', 'search', 'please', 'look', 'see', 'the', 'this',
    'that', 'these', 'those', 'from', 'with', 'and', 'for', 'are', 'was',
    'were', 'have', 'has', 'had', 'is', 'in', 'on', 'at', 'by', 'of', 'to',
    'you', 'your', 'them', 'they', 'their', 'there', 'it', 'its', 'we', 'our',
    'us', 'me', 'my', 'into', 'over', 'under', 'what', 'when', 'where', 'who',
    'how', 'does', 'did', 'do', 'any', 'some', 'all', 'discussed',
    'discussing', 'discussion', 'discussions', 'conversation', 'conversations',
    'messages', 'message', 'channel', 'channels', 'chat', 'chats', 'happened',
    'happening', 'recent', 'recently', 'since', 'earlier', 'last', 'week',
    'month', 'year', 'day', 'days', 'weeks', 'months', 'years', 'weekend',
    'today', 'yesterday', 'past', 'previous', 'ago',
]);
const INTENT_RULES = [
    { hints: ['decided', 'decision', 'decisions', 'agreed', 'decide'], intents: 'find decisions' },
    { hints: ['status', 'progress', 'update', 'updates', 'updated'], intents: 'find status update' },
    { hints: ['bug', 'error', 'issue', 'problem', 'broken', 'failing', 'failed'], intents: 'find problem report' },
    { hints: ['discuss', 'discussion', 'discussed', 'talked', 'said', 'about'], intents: 'find discussion' },
    { hints: ['recent', 'newly', 'latest', 'newest', 'since'], intents: 'recent' },
];
function extractKeywords(query) {
    const tokens = query
        .toLowerCase()
        .replace(/[^\w@\s-]/g, ' ')
        .split(/\s+/)
        .map((t) => t.replace(/^@/, ''))
        .filter((t) => t.length >= 3 &&
        !STOP_WORDS.has(t) &&
        !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/.test(t));
    const seen = new Set();
    const unique = [];
    for (const t of tokens) {
        if (!seen.has(t)) {
            seen.add(t);
            unique.push(t);
        }
    }
    return unique.slice(0, 6);
}
function extractSources(query) {
    const lower = query.toLowerCase();
    const matched = new Set();
    if (/\bannouncements?\b/.test(lower))
        matched.add('announcements');
    if (/\bmeetings?\b|\bcalendar\b/.test(lower))
        matched.add('meetings');
    if (/\btasks?\b|\bto-?do\b/.test(lower))
        matched.add('tasks');
    if (/\bprojects?\b/.test(lower))
        matched.add('projects');
    if (/\bmilestones?\b/.test(lower))
        matched.add('milestones');
    if (/\bdepartments?\b|\bteam channel\b/.test(lower))
        matched.add('departments');
    if (/\bchat|conversations?|messages?|discussions?\b|\bchannel\b/.test(lower)) {
        matched.add('chat');
    }
    if (matched.size === 0)
        matched.add('chat');
    return [...matched];
}
function extractIntent(query) {
    const lower = query.toLowerCase();
    for (const rule of INTENT_RULES) {
        if (rule.hints.some((hint) => lower.includes(hint)))
            return rule.intents;
    }
    return 'find';
}
let MockNlSearchProvider = class MockNlSearchProvider {
    constructor() {
        this.name = 'mock';
    }
    async parse(context) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        const range = (0, date_utils_1.resolveRelativeDateRange)(context.query, context.nowIso);
        const channels = [];
        const queryLower = context.query.toLowerCase();
        for (const name of context.channelNames ?? []) {
            if (name && queryLower.includes(name.toLowerCase())) {
                channels.push(name);
            }
        }
        const users = [];
        for (const name of context.userNames ?? []) {
            if (name && queryLower.includes(name.toLowerCase())) {
                users.push(name);
            }
        }
        return {
            keywords: extractKeywords(context.query),
            startDate: range ? (0, date_utils_1.toValidIso)(range.startDate) : null,
            endDate: range ? (0, date_utils_1.toValidIso)(range.endDate) : null,
            users,
            channels,
            sources: extractSources(context.query),
            intent: extractIntent(context.query),
            provider: this.name,
        };
    }
};
exports.MockNlSearchProvider = MockNlSearchProvider;
exports.MockNlSearchProvider = MockNlSearchProvider = __decorate([
    (0, common_1.Injectable)()
], MockNlSearchProvider);
//# sourceMappingURL=mock-nl-search.provider.js.map