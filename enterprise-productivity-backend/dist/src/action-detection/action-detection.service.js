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
var ActionDetectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDetectionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const ai_actions_schema_1 = require("../database/schema/ai-actions.schema");
const stream_service_1 = require("../stream/stream.service");
const action_detection_provider_1 = require("./action-detection.provider");
const BACKFILL_INITIAL_DELAY_MS = 20_000;
const BACKFILL_MESSAGES_LIMIT = 30;
let ActionDetectionService = ActionDetectionService_1 = class ActionDetectionService {
    constructor(db, streamService, configService, provider) {
        this.db = db;
        this.streamService = streamService;
        this.configService = configService;
        this.provider = provider;
        this.logger = new common_1.Logger(ActionDetectionService_1.name);
        this.backfillTimer = null;
    }
    onModuleInit() {
        const intervalMs = this.configService.get('actionDetection.backfillIntervalMs') ??
            900_000;
        this.backfillTimer = setInterval(() => {
            void this.runBackfill().catch((err) => this.logger.error(`Action detection backfill failed: ${err instanceof Error ? err.message : err}`));
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
    async analyze(channelId, userId, messageId) {
        const meta = await this.resolveChannel(channelId, userId);
        const target = await this.fetchTargetMessage(channelId, messageId);
        if (!target)
            return [];
        const result = await this.provider.detect({
            channelId,
            channelName: meta.name,
            message: target.message,
        });
        const items = [];
        for (const suggestion of result.actions) {
            const stored = await this.storeOrGet(channelId, target.message, meta.name, suggestion);
            if (stored)
                items.push(stored);
        }
        return items.map((a) => this.toItem(a, false));
    }
    async list(channelId, userId) {
        await this.resolveChannel(channelId, userId);
        const rows = await this.db
            .select()
            .from(ai_actions_schema_1.aiDetectedActions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(ai_actions_schema_1.aiDetectedActions.channelId, channelId), (0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.status} = 'pending'`, (0, drizzle_orm_1.sql) `NOT EXISTS (
            SELECT 1 FROM ${ai_actions_schema_1.aiActionDismissals}
            WHERE ${ai_actions_schema_1.aiActionDismissals.actionId} = ${ai_actions_schema_1.aiDetectedActions.id}
              AND ${ai_actions_schema_1.aiActionDismissals.userId} = ${userId}
          )`))
            .orderBy((0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} DESC`);
        return rows.map((r) => this.toItem(r, false));
    }
    async findOne(actionId, userId) {
        const action = await this.getAction(actionId);
        await this.resolveChannel(action.channelId, userId);
        const [dismissal] = await this.db
            .select({ id: ai_actions_schema_1.aiActionDismissals.id })
            .from(ai_actions_schema_1.aiActionDismissals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(ai_actions_schema_1.aiActionDismissals.actionId, action.id), (0, drizzle_orm_1.eq)(ai_actions_schema_1.aiActionDismissals.userId, userId)))
            .limit(1);
        return this.toItem(action, Boolean(dismissal));
    }
    async dismiss(actionId, userId) {
        const action = await this.getAction(actionId);
        await this.resolveChannel(action.channelId, userId);
        await this.db
            .insert(ai_actions_schema_1.aiActionDismissals)
            .values({ actionId: action.id, userId })
            .onConflictDoNothing();
        return this.toItem(action, true);
    }
    async resolve(actionId, userId, dto) {
        const action = await this.getAction(actionId);
        await this.resolveChannel(action.channelId, userId);
        const entityType = dto.entityType ?? action.intentType;
        const [updated] = await this.db
            .update(ai_actions_schema_1.aiDetectedActions)
            .set({
            status: 'created',
            createdById: userId,
            resolvedEntityType: entityType,
            resolvedEntityId: dto.entityId ?? null,
            resolutionNote: dto.note ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(ai_actions_schema_1.aiDetectedActions.id, action.id))
            .returning();
        this.logger.log(`Action ${action.id} resolved as ${entityType} by ${userId}`);
        return this.toItem(updated, false);
    }
    async storeOrGet(channelId, message, channelName, suggestion) {
        const existing = await this.findByMessageAndIntent(message.id ?? '', suggestion.intentType);
        if (existing) {
            return existing.status === 'pending' ? existing : null;
        }
        try {
            const [inserted] = await this.db
                .insert(ai_actions_schema_1.aiDetectedActions)
                .values({
                channelId,
                messageId: message.id ?? '',
                senderId: message.userId,
                channelName,
                intentType: suggestion.intentType,
                title: suggestion.title,
                summary: suggestion.summary || null,
                confidence: String(suggestion.confidence),
                sourceMessageText: message.text || null,
                meta: suggestion.meta ?? {},
            })
                .returning();
            return inserted;
        }
        catch (err) {
            const reason = err?.code;
            if (reason === '23505') {
                const existingAfter = await this.findByMessageAndIntent(message.id ?? '', suggestion.intentType);
                return existingAfter && existingAfter.status === 'pending'
                    ? existingAfter
                    : null;
            }
            throw err;
        }
    }
    async findByMessageAndIntent(messageId, intentType) {
        if (!messageId)
            return null;
        const [row] = await this.db
            .select()
            .from(ai_actions_schema_1.aiDetectedActions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(ai_actions_schema_1.aiDetectedActions.messageId, messageId), (0, drizzle_orm_1.eq)(ai_actions_schema_1.aiDetectedActions.intentType, intentType)))
            .limit(1);
        return row ?? null;
    }
    async getAction(actionId) {
        const [row] = await this.db
            .select()
            .from(ai_actions_schema_1.aiDetectedActions)
            .where((0, drizzle_orm_1.eq)(ai_actions_schema_1.aiDetectedActions.id, actionId))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException(`Action ${actionId} not found`);
        return row;
    }
    async resolveChannel(channelId, userId) {
        const meta = await this.describeChannel(channelId);
        if (!meta.members.includes(userId)) {
            throw new common_1.ForbiddenException('You are not a member of this conversation.');
        }
        return meta;
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
                members,
            };
        }
        catch (err) {
            this.logger.warn(`Failed to describe channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Conversation ${channelId} not found`);
        }
    }
    async fetchTargetMessage(channelId, messageId) {
        try {
            if (messageId) {
                const { message } = await this.client().getMessage(messageId);
                if (message.channel?.id && message.channel.id !== channelId) {
                    throw new common_1.NotFoundException('Message does not belong to the given channel');
                }
                return { message: this.toDetectionMessage(message) };
            }
            const channel = this.client().channel('messaging', channelId);
            const { messages } = await channel.query({ messages: { limit: 1 } });
            const latest = messages.find((m) => !m.type || m.type === 'regular');
            if (!latest)
                return null;
            return { message: this.toDetectionMessage(latest) };
        }
        catch (err) {
            this.logger.warn(`Failed to fetch message for analysis in ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Message ${messageId ?? ''} not found`.trim());
        }
    }
    toDetectionMessage(m) {
        return {
            id: m.id,
            user: m.user?.name ?? m.user?.id ?? 'Unknown',
            userId: m.user?.id ?? null,
            text: m.text ?? '',
            createdAt: m.created_at ?? null,
        };
    }
    async runBackfill() {
        let channelIds;
        try {
            const channels = await this.client().queryChannels({ type: 'messaging' }, { last_message_at: -1 }, { limit: 100 });
            channelIds = channels
                .map((channel) => channel.id)
                .filter((id) => Boolean(id));
        }
        catch (err) {
            this.logger.warn(`Failed to list channels for action detection backfill: ${err instanceof Error ? err.message : err}`);
            return;
        }
        for (const channelId of channelIds) {
            try {
                await this.backfillChannel(channelId);
            }
            catch (err) {
                this.logger.warn(`Action detection backfill skipped channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            }
        }
    }
    async backfillChannel(channelId) {
        let channelMeta;
        let messages;
        try {
            const channel = this.client().channel('messaging', channelId);
            const { messages: msgs } = await channel.query({
                messages: { limit: BACKFILL_MESSAGES_LIMIT },
            });
            messages = msgs.filter((m) => !m.type || m.type === 'regular');
            channelMeta = await this.describeChannel(channelId);
        }
        catch (err) {
            this.logger.warn(`Backfill could not read channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            return;
        }
        const candidates = messages.filter((m) => m.id && m.text?.trim());
        if (candidates.length === 0)
            return;
        const ids = candidates
            .map((m) => m.id)
            .filter((id) => Boolean(id));
        const existingRows = await this.db
            .select({ messageId: ai_actions_schema_1.aiDetectedActions.messageId })
            .from(ai_actions_schema_1.aiDetectedActions)
            .where((0, drizzle_orm_1.inArray)(ai_actions_schema_1.aiDetectedActions.messageId, ids));
        const stored = new Set(existingRows.map((r) => r.messageId));
        for (const message of candidates) {
            const messageId = message.id ?? '';
            if (stored.has(messageId))
                continue;
            let result;
            try {
                result = await this.provider.detect({
                    channelId,
                    channelName: channelMeta.name,
                    message: this.toDetectionMessage(message),
                });
            }
            catch (err) {
                this.logger.warn(`Action detection failed for message ${messageId}: ${err instanceof Error ? err.message : err}`);
                continue;
            }
            for (const suggestion of result.actions) {
                await this.storeOrGet(channelId, this.toDetectionMessage(message), channelMeta.name, suggestion);
            }
        }
    }
    toItem(action, dismissedByMe) {
        return {
            id: action.id,
            channelId: action.channelId,
            messageId: action.messageId,
            senderId: action.senderId ?? null,
            channelName: action.channelName ?? null,
            intentType: action.intentType,
            title: action.title,
            summary: action.summary ?? null,
            confidence: action.confidence ? Number(action.confidence) : null,
            sourceMessageText: action.sourceMessageText ?? null,
            meta: action.meta ?? null,
            status: action.status,
            createdById: action.createdById ?? null,
            resolvedEntityType: action.resolvedEntityType ?? null,
            resolvedEntityId: action.resolvedEntityId ?? null,
            resolutionNote: action.resolutionNote ?? null,
            dismissedByMe,
            detectedAt: action.detectedAt.toISOString(),
            createdAt: action.createdAt.toISOString(),
            updatedAt: action.updatedAt.toISOString(),
        };
    }
};
exports.ActionDetectionService = ActionDetectionService;
exports.ActionDetectionService = ActionDetectionService = ActionDetectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __param(3, (0, common_1.Inject)(action_detection_provider_1.ACTION_DETECTION_PROVIDER)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        config_1.ConfigService, Object])
], ActionDetectionService);
//# sourceMappingURL=action-detection.service.js.map