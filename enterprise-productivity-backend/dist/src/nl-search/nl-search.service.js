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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NlSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlSearchService = void 0;
const common_1 = require("@nestjs/common");
const stream_service_1 = require("../stream/stream.service");
const users_service_1 = require("../users/users.service");
const nl_search_provider_1 = require("./nl-search.provider");
const mock_nl_search_provider_1 = require("./providers/mock-nl-search.provider");
const SOURCE_BY_KIND = {
    task: 'tasks',
    project: 'projects',
    milestone: 'milestones',
    announcement: 'announcements',
    department: 'departments',
};
const CHANNEL_FETCH_LIMIT = 300;
const RESULTS_CAP = 30;
const MAX_KEYWORD_SEARCHES = 6;
function sourceFor(channel) {
    if (channel.kind && SOURCE_BY_KIND[channel.kind]) {
        return SOURCE_BY_KIND[channel.kind];
    }
    if (!channel.kind &&
        channel.name &&
        channel.name.toLowerCase().startsWith('meeting:')) {
        return 'meetings';
    }
    return 'chat';
}
let NlSearchService = NlSearchService_1 = class NlSearchService {
    constructor(streamService, usersService, provider) {
        this.streamService = streamService;
        this.usersService = usersService;
        this.provider = provider;
        this.logger = new common_1.Logger(NlSearchService_1.name);
    }
    async search(userId, query) {
        const nowIso = new Date().toISOString();
        const channels = await this.fetchAccessibleChannels(userId);
        const allowedByCid = new Map(channels.map((c) => [c.cid, c]));
        const allowedIds = new Set(channels.map((c) => c.cid.split(':')[1]));
        const directory = await this.loadDirectoryNames();
        const context = {
            query,
            nowIso,
            channelNames: channels
                .map((c) => c.name)
                .filter((n) => Boolean(n)),
            userNames: directory.byUsername
                .map((u) => u.name)
                .filter((n) => Boolean(n)),
        };
        const intent = await this.parseIntent(context);
        let searchable = channels;
        if (intent.channels.length > 0) {
            const wanted = new Set(intent.channels.map((c) => c.toLowerCase()));
            searchable = channels.filter((c) => c.name ? wanted.has(c.name.toLowerCase()) : false);
            if (searchable.length === 0) {
                return {
                    query,
                    intent,
                    provider: intent.provider,
                    total: 0,
                    results: [],
                };
            }
        }
        const cids = searchable.map((c) => c.cid).slice(0, 200);
        const messages = await this.fetchMessages(cids, intent);
        const results = this.enrich(messages, intent, allowedByCid, allowedIds, directory.byUsername);
        return {
            query,
            intent,
            provider: intent.provider,
            total: results.length,
            results,
        };
    }
    async parseIntent(context) {
        try {
            return await this.provider.parse(context);
        }
        catch (err) {
            this.logger.error(`AI intent parsing failed; using heuristic fallback: ${err instanceof Error ? err.message : String(err)}`);
            return new mock_nl_search_provider_1.MockNlSearchProvider().parse(context);
        }
    }
    async fetchAccessibleChannels(userId) {
        const response = await this.streamService
            .getClient()
            .queryChannels({ type: 'messaging', members: { $in: [userId] } }, { last_message_at: -1 }, { limit: CHANNEL_FETCH_LIMIT });
        return response.map((channel) => {
            const data = (channel.data ?? {});
            const memberCount = Object.keys((channel.state.members ?? {})).length;
            const rawName = data.name ?? '';
            const name = rawName.trim() ||
                (memberCount <= 2 ? 'Direct message' : 'Conversation');
            const kind = data.channel_kind ?? null;
            return {
                id: channel.id ?? '',
                cid: channel.cid,
                name,
                kind,
                memberCount,
            };
        });
    }
    async loadDirectoryNames() {
        const users = await this.usersService
            .findAllExcept('')
            .catch(() => []);
        const byUsername = users.map((u) => ({
            username: u.username,
            name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
        }));
        return { byUsername };
    }
    async fetchMessages(cids, intent) {
        const client = this.streamService.getClient();
        const messageFilter = {};
        if (intent.startDate || intent.endDate) {
            messageFilter.created_at = {
                ...(intent.startDate ? { $gte: intent.startDate } : {}),
                ...(intent.endDate ? { $lte: intent.endDate } : {}),
            };
        }
        const channelFilter = { cid: { $in: cids } };
        const sort = { created_at: -1 };
        const keywords = intent.keywords.slice(0, MAX_KEYWORD_SEARCHES);
        let fetched = [];
        try {
            if (keywords.length > 0) {
                const batches = await Promise.all(keywords.map((keyword) => client
                    .search(channelFilter, {
                    ...messageFilter,
                    text: { $autocomplete: keyword },
                }, { limit: 50, sort })
                    .catch(() => ({ results: [] }))));
                for (const batch of batches) {
                    fetched.push(...batch.results.map((r) => r.message));
                }
            }
            else {
                const batch = await client.search(channelFilter, messageFilter, { limit: 50, sort });
                fetched.push(...batch.results.map((r) => r.message));
            }
        }
        catch (err) {
            this.logger.error(`Stream message search failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        const seen = new Set();
        const unique = [];
        for (const message of fetched) {
            if (!message?.id || seen.has(message.id))
                continue;
            seen.add(message.id);
            unique.push(message);
        }
        return unique;
    }
    enrich(messages, intent, allowedByCid, allowedIds, directory) {
        const directoryByUser = new Map(directory.map((u) => [u.username, u.name]));
        const expectedSources = new Set(intent.sources.map((s) => s.toLowerCase()));
        const expectedChannels = new Set(intent.channels.map((c) => c.toLowerCase()));
        const keywordLower = intent.keywords.map((k) => k.toLowerCase());
        const items = [];
        for (const message of messages) {
            const channel = this.resolveChannel(message, allowedByCid, allowedIds);
            if (!channel)
                continue;
            const text = (message.text ?? '').trim();
            if (!text)
                continue;
            if (message.type && message.type !== 'regular')
                continue;
            if (message.deleted_at)
                continue;
            const textLower = text.toLowerCase();
            const matchedKeywords = keywordLower.filter((k) => textLower.includes(k));
            const senderId = message.user?.id ?? null;
            const sender = message.user?.name ||
                (senderId ? directoryByUser.get(senderId) : undefined) ||
                null;
            const createdIso = message.created_at
                ? new Date(message.created_at).toISOString()
                : new Date().toISOString();
            const source = sourceFor(channel);
            let score = 0;
            score += matchedKeywords.length;
            if (matchedKeywords.length === keywordLower.length && keywordLower.length > 0) {
                score += 2;
            }
            if (channel.name) {
                const names = [channel.name.toLowerCase(), source];
                if (names.some((n) => expectedChannels.has(n)))
                    score += 1;
            }
            if (expectedSources.has(source))
                score += 1;
            if (channel.kind === 'announcement' || source === 'announcements') {
                score += 1;
            }
            items.push({
                id: message.id ?? '',
                source,
                preview: this.buildPreview(text, matchedKeywords),
                senderId,
                senderName: sender,
                senderImageUrl: message.user?.image ?? null,
                channelId: channel.id,
                channelName: channel.name,
                createdAt: createdIso,
                url: `/dashboard?channel=${encodeURIComponent(channel.id)}&message=${encodeURIComponent(message.id ?? '')}`,
                matchedKeywords,
                score,
            });
        }
        return items
            .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
            .slice(0, RESULTS_CAP)
            .map(({ score: _score, ...item }) => item);
    }
    resolveChannel(message, allowedByCid, allowedIds) {
        const cid = message.cid;
        if (cid && allowedByCid.has(cid)) {
            return allowedByCid.get(cid) ?? null;
        }
        if (cid) {
            const id = cid.split(':')[1];
            if (id && allowedIds.has(id)) {
                return { id, cid, name: 'Conversation', kind: null, memberCount: 0 };
            }
        }
        return null;
    }
    buildPreview(text, matchedKeywords) {
        if (text.length <= 220)
            return text;
        let start = 0;
        if (matchedKeywords.length > 0) {
            const lower = text.toLowerCase();
            let firstHit = -1;
            for (const kw of matchedKeywords) {
                const idx = lower.indexOf(kw);
                if (idx >= 0) {
                    firstHit = firstHit < 0 ? idx : Math.min(firstHit, idx);
                }
            }
            if (firstHit >= 0) {
                start = Math.max(0, firstHit - 110);
            }
        }
        const end = Math.min(text.length, start + 210);
        const prefix = start > 0 ? '…' : '';
        const suffix = end < text.length ? '…' : '';
        return `${prefix}${text.slice(start, end)}${suffix}`;
    }
};
exports.NlSearchService = NlSearchService;
exports.NlSearchService = NlSearchService = NlSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(nl_search_provider_1.NL_SEARCH_PROVIDER)),
    __metadata("design:paramtypes", [stream_service_1.StreamService,
        users_service_1.UsersService, Object])
], NlSearchService);
//# sourceMappingURL=nl-search.service.js.map