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
var OpenAiNlSearchProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiNlSearchProvider = void 0;
const common_1 = require("@nestjs/common");
const nl_search_provider_1 = require("../nl-search.provider");
const date_utils_1 = require("../date-utils");
function asStringArray(value, max) {
    if (!Array.isArray(value))
        return [];
    const seen = new Set();
    const items = [];
    for (const item of value) {
        if (typeof item !== 'string')
            continue;
        const trimmed = item.trim();
        if (!trimmed || seen.has(trimmed))
            continue;
        seen.add(trimmed);
        items.push(trimmed);
        if (items.length >= max)
            break;
    }
    return items;
}
let OpenAiNlSearchProvider = OpenAiNlSearchProvider_1 = class OpenAiNlSearchProvider {
    constructor(apiKey, baseUrl, model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.name = 'openai';
        this.logger = new common_1.Logger(OpenAiNlSearchProvider_1.name);
    }
    async parse(context) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                temperature: 0.1,
                max_tokens: 400,
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
        const availableChannels = new Set((context.channelNames ?? [])
            .map((n) => n.trim().toLowerCase())
            .filter(Boolean));
        const availableUsers = new Set((context.userNames ?? [])
            .map((n) => n.trim().toLowerCase())
            .filter(Boolean));
        const validSources = new Set(nl_search_provider_1.NL_SEARCH_SOURCES);
        const keywords = asStringArray(raw.keywords, 6);
        const startDate = (0, date_utils_1.toValidIso)(raw.startDate);
        const endDate = (0, date_utils_1.toValidIso)(raw.endDate);
        const users = asStringArray(raw.users, 10).filter((u) => availableUsers.has(u.toLowerCase()));
        const channels = asStringArray(raw.channels, 10).filter((c) => availableChannels.has(c.toLowerCase()));
        const sources = asStringArray(raw.sources, nl_search_provider_1.NL_SEARCH_SOURCES.length).filter((s) => validSources.has(s.toLowerCase()));
        const intent = typeof raw.intent === 'string' && raw.intent.trim()
            ? raw.intent.trim().slice(0, 60)
            : 'find';
        const resolvedSources = sources.length > 0 ? sources : ['chat'];
        return {
            keywords,
            startDate,
            endDate,
            users,
            channels,
            sources: resolvedSources,
            intent,
            provider: this.name,
        };
    }
    buildPrompt(context) {
        return [
            `Query: "${context.query}"`,
            `Current time: ${context.nowIso}`,
            '',
            `Channels the requester can access: ${context.channelNames.length
                ? context.channelNames.join(', ')
                : '(none provided)'}`,
            `Users in the directory: ${context.userNames.length
                ? context.userNames.join(', ')
                : '(none provided)'}`,
            '',
            'Return the parsing JSON now.',
        ].join('\n');
    }
    systemPrompt() {
        return [
            'You turn free-form search queries into structured search intents for a',
            'professional messaging/productivity platform.',
            '',
            'Respond with valid JSON only in this exact shape:',
            '{"keywords": string[], "startDate": string|null, "endDate": string|null,',
            ' "users": string[], "channels": string[], "sources": string[], "intent": string}.',
            '',
            'Rules:',
            '- keywords: 1-6 search terms capturing the topic (e.g. "authentication",',
            '  "login bug"). Keep the original casing for acronyms.',
            '- Dates: resolve relative phrases into ABSOLUTE ISO-8601 strings based on',
            '  the Current time provided. "today", "yesterday", "last week", "this',
            '  month", "last month", "past 7 days" etc. startDate is the window start',
            '  (inclusive), endDate the window end (inclusive), or null when the query',
            '  has no time restriction.',
            '- users/channels: ONLY pick values from the lists provided, preserving',
            '  their exact spelling. Empty array when none are mentioned.',
            '- sources: pick only from: chat, tasks, meetings, announcements, projects,',
            '  milestones, departments. Map chat messages/conversations to "chat". Default',
            '  to ["chat"] plus any others mentioned.',
            '- intent: a short label such as "find discussion" or "find decisions".',
            'Return only the JSON object, nothing else.',
        ].join('\n');
    }
};
exports.OpenAiNlSearchProvider = OpenAiNlSearchProvider;
exports.OpenAiNlSearchProvider = OpenAiNlSearchProvider = OpenAiNlSearchProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, String])
], OpenAiNlSearchProvider);
//# sourceMappingURL=openai-nl-search.provider.js.map