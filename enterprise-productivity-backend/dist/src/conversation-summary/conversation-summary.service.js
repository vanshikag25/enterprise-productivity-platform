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
var ConversationSummaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationSummaryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const conversation_summaries_schema_1 = require("../database/schema/conversation-summaries.schema");
const stream_service_1 = require("../stream/stream.service");
const conversation_summary_provider_1 = require("./conversation-summary.provider");
const MESSAGES_LIMIT = 500;
const BACKFILL_INITIAL_DELAY_MS = 15_000;
let ConversationSummaryService = ConversationSummaryService_1 = class ConversationSummaryService {
    constructor(db, streamService, configService, provider) {
        this.db = db;
        this.streamService = streamService;
        this.configService = configService;
        this.provider = provider;
        this.logger = new common_1.Logger(ConversationSummaryService_1.name);
        this.backfillTimer = null;
    }
    onModuleInit() {
        const intervalMs = this.configService.get('summaries.backfillIntervalMs') ??
            3_600_000;
        this.backfillTimer = setInterval(() => {
            void this.runBackfill().catch((err) => this.logger.error(`Conversation summary backfill failed: ${err instanceof Error ? err.message : err}`));
        }, intervalMs);
        setTimeout(() => void this.runBackfill().catch(() => undefined), BACKFILL_INITIAL_DELAY_MS);
    }
    onModuleDestroy() {
        if (this.backfillTimer)
            clearInterval(this.backfillTimer);
    }
    client() {
        return this.streamService.getClient();
    }
    async listSummaries(channelId, userId) {
        await this.assertChannelMember(channelId, userId);
        return this.db
            .select()
            .from(conversation_summaries_schema_1.conversationSummaries)
            .where((0, drizzle_orm_1.eq)(conversation_summaries_schema_1.conversationSummaries.channelId, channelId))
            .orderBy((0, drizzle_orm_1.desc)(conversation_summaries_schema_1.conversationSummaries.generatedAt))
            .limit(100);
    }
    async getCurrent(channelId, userId, periodType) {
        await this.assertChannelMember(channelId, userId);
        const { start, end } = this.currentPeriod(periodType);
        const existing = await this.findByPeriod(channelId, periodType, start);
        if (existing)
            return existing;
        return this.buildAndStore(channelId, periodType, start, end, await this.describeChannel(channelId));
    }
    async generate(channelId, userId, dto) {
        const meta = await this.resolveChannel(channelId, userId);
        if (dto.periodType === 'manual') {
            if (dto.start && dto.end) {
                const start = new Date(dto.start);
                const end = new Date(dto.end);
                if (start.getTime() >= end.getTime()) {
                    throw new common_1.NotFoundException('start must be before end');
                }
                return this.buildAndStore(channelId, 'manual', start, end, meta);
            }
            return this.generateManual(channelId, meta);
        }
        const { start, end } = this.currentPeriod(dto.periodType);
        return this.buildAndStore(channelId, dto.periodType, start, end, meta);
    }
    async generateManual(channelId, meta) {
        const messages = await this.fetchRecentMessages(channelId);
        const end = new Date();
        const earliest = messages[messages.length - 1];
        const start = earliest?.createdAt ? new Date(earliest.createdAt) : end;
        return this.buildAndStore(channelId, 'manual', start, end, meta, messages);
    }
    async buildAndStore(channelId, periodType, start, end, meta, messagesOverride) {
        const messages = messagesOverride ??
            (await this.fetchMessagesInPeriod(channelId, start, end));
        const result = await this.provider.generate({
            channelId,
            channelName: meta.name,
            memberCount: meta.memberCount,
            periodType,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            messages,
        });
        const generatedAt = new Date(result.generatedAt);
        const [row] = await this.db
            .insert(conversation_summaries_schema_1.conversationSummaries)
            .values({
            channelId,
            periodType,
            periodStart: start,
            periodEnd: end,
            overview: result.overview,
            keyDecisions: result.keyDecisions,
            actionItems: result.actionItems,
            unresolvedTopics: result.unresolvedTopics,
            messageCount: messages.length,
            provider: result.provider,
            generatedAt,
            updatedAt: generatedAt,
        })
            .onConflictDoUpdate({
            target: [
                conversation_summaries_schema_1.conversationSummaries.channelId,
                conversation_summaries_schema_1.conversationSummaries.periodType,
                conversation_summaries_schema_1.conversationSummaries.periodStart,
            ],
            set: {
                periodEnd: end,
                overview: result.overview,
                keyDecisions: result.keyDecisions,
                actionItems: result.actionItems,
                unresolvedTopics: result.unresolvedTopics,
                messageCount: messages.length,
                provider: result.provider,
                generatedAt,
                updatedAt: generatedAt,
            },
        })
            .returning();
        this.logger.log(`Stored ${periodType} summary for channel ${channelId} (${messages.length} messages, ${result.provider})`);
        return row;
    }
    async findByPeriod(channelId, periodType, start) {
        const [row] = await this.db
            .select()
            .from(conversation_summaries_schema_1.conversationSummaries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(conversation_summaries_schema_1.conversationSummaries.channelId, channelId), (0, drizzle_orm_1.eq)(conversation_summaries_schema_1.conversationSummaries.periodType, periodType), (0, drizzle_orm_1.eq)(conversation_summaries_schema_1.conversationSummaries.periodStart, start)));
        return row ?? null;
    }
    async runBackfill() {
        const channelIds = await this.allChannelIds();
        const today = this.startOfUtcDay(new Date());
        const weekStart = this.startOfUtcWeek(new Date());
        for (const channelId of channelIds) {
            try {
                const meta = await this.describeChannel(channelId);
                await this.ensurePeriod(channelId, 'daily', this.addDays(today, -1), today, meta);
                await this.ensurePeriod(channelId, 'weekly', this.addDays(weekStart, -7), weekStart, meta);
            }
            catch (err) {
                this.logger.warn(`Summary backfill skipped channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            }
        }
    }
    async ensurePeriod(channelId, periodType, start, end, meta) {
        const existing = await this.findByPeriod(channelId, periodType, start);
        if (existing)
            return;
        await this.buildAndStore(channelId, periodType, start, end, meta);
    }
    async allChannelIds() {
        try {
            const channels = await this.client().queryChannels({ type: 'messaging' }, { last_message_at: -1 }, { limit: 200 });
            return channels
                .map((channel) => channel.id)
                .filter((id) => Boolean(id));
        }
        catch (err) {
            this.logger.warn(`Failed to list channels for summary backfill: ${err instanceof Error ? err.message : err}`);
            return [];
        }
    }
    async describeChannel(channelId) {
        const channel = this.client().channel('messaging', channelId);
        try {
            const response = await channel.query({
                members: { limit: 100 },
                messages: { limit: 1 },
            });
            const members = response.members
                .map((member) => member.user_id)
                .filter((id) => Boolean(id));
            return {
                name: response.channel?.name ??
                    null,
                memberCount: members.length,
                members,
            };
        }
        catch (err) {
            this.logger.warn(`Failed to describe channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Conversation ${channelId} not found`);
        }
    }
    async resolveChannel(channelId, userId) {
        const meta = await this.describeChannel(channelId);
        if (!meta.members.includes(userId)) {
            throw new common_1.ForbiddenException('You are not a member of this conversation');
        }
        return meta;
    }
    async assertChannelMember(channelId, userId) {
        await this.resolveChannel(channelId, userId);
    }
    async fetchMessagesInPeriod(channelId, start, end) {
        try {
            const response = await this.client().search({ cid: { $eq: `messaging:${channelId}` } }, {
                created_at: { $gte: start.toISOString() },
            }, { limit: MESSAGES_LIMIT, sort: { created_at: -1 } });
            return response.results
                .map(({ message }) => message)
                .filter((m) => !m.type || m.type === 'regular')
                .map((m) => this.toMessage(m))
                .filter((m) => {
                if (!m.createdAt)
                    return false;
                const time = new Date(m.createdAt).getTime();
                return time >= start.getTime() && time < end.getTime();
            });
        }
        catch (err) {
            this.logger.warn(`Message search failed for channel ${channelId}, falling back to recent messages: ${err instanceof Error ? err.message : err}`);
            return this.fetchRecentMessages(channelId, start, end);
        }
    }
    async fetchRecentMessages(channelId, start, end) {
        const channel = this.client().channel('messaging', channelId);
        const { messages } = await channel.query({ messages: { limit: 200 } });
        return messages
            .filter((m) => !m.type || m.type === 'regular')
            .filter((m) => {
            if (!m.created_at)
                return false;
            const time = new Date(m.created_at).getTime();
            if (start && time < start.getTime())
                return false;
            if (end && time >= end.getTime())
                return false;
            return true;
        })
            .map((m) => this.toMessage(m));
    }
    toMessage(m) {
        return {
            user: m.user?.name ?? m.user?.id ?? 'Unknown',
            text: m.text ?? '',
            createdAt: m.created_at ?? null,
        };
    }
    currentPeriod(periodType) {
        const now = new Date();
        if (periodType === 'daily') {
            return { start: this.startOfUtcDay(now), end: now };
        }
        return { start: this.startOfUtcWeek(now), end: now };
    }
    startOfUtcDay(date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    startOfUtcWeek(date) {
        const day = this.startOfUtcDay(date);
        const daysSinceMonday = (day.getUTCDay() + 6) % 7;
        day.setUTCDate(day.getUTCDate() - daysSinceMonday);
        return day;
    }
    addDays(date, days) {
        return new Date(date.getTime() + days * 86_400_000);
    }
};
exports.ConversationSummaryService = ConversationSummaryService;
exports.ConversationSummaryService = ConversationSummaryService = ConversationSummaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __param(3, (0, common_1.Inject)(conversation_summary_provider_1.CONVERSATION_SUMMARY_PROVIDER)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        config_1.ConfigService, Object])
], ConversationSummaryService);
//# sourceMappingURL=conversation-summary.service.js.map