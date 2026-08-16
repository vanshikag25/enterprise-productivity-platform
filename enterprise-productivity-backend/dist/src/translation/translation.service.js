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
var TranslationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const message_translations_schema_1 = require("../database/schema/message-translations.schema");
const stream_service_1 = require("../stream/stream.service");
const languages_1 = require("../languages");
const translation_provider_1 = require("./translation.provider");
let TranslationService = TranslationService_1 = class TranslationService {
    constructor(db, streamService, provider) {
        this.db = db;
        this.streamService = streamService;
        this.provider = provider;
        this.logger = new common_1.Logger(TranslationService_1.name);
    }
    async translate(channelId, messageId, userId, targetLanguage) {
        const language = targetLanguage.trim().toLowerCase();
        if (!(0, languages_1.isSupportedLanguage)(language)) {
            throw new common_1.BadRequestException(`Unsupported target language "${targetLanguage}".`);
        }
        await this.resolveChannel(channelId, userId);
        const { message } = await this.fetchMessage(messageId);
        if (message.channel?.id && message.channel.id !== channelId) {
            throw new common_1.BadRequestException('Message does not belong to the given channel');
        }
        const text = (message.text ?? '').trim();
        if (!text) {
            throw new common_1.BadRequestException('This message has no text to translate.');
        }
        const sourceHash = this.hash(text);
        const cached = await this.findCached(messageId, language);
        if (cached && cached.sourceHash === sourceHash) {
            return {
                messageId,
                targetLanguage: language,
                sourceLanguage: cached.detectedSourceLanguage ?? null,
                translatedText: cached.translatedText,
                cached: true,
                provider: cached.provider,
            };
        }
        const result = await this.provider.translate({
            text,
            targetLanguage: language,
        });
        const translatedText = result.detectedSourceLanguage === language ? text : result.translatedText;
        if (result.detectedSourceLanguage !== language) {
            await this.upsertCache({
                messageId,
                targetLanguage: language,
                sourceHash,
                sourceText: text,
                detectedSourceLanguage: result.detectedSourceLanguage,
                translatedText,
                provider: result.provider,
            });
        }
        return {
            messageId,
            targetLanguage: language,
            sourceLanguage: result.detectedSourceLanguage ?? null,
            translatedText,
            cached: false,
            provider: result.provider,
        };
    }
    async findCached(messageId, targetLanguage) {
        const [row] = await this.db
            .select()
            .from(message_translations_schema_1.messageTranslations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_translations_schema_1.messageTranslations.messageId, messageId), (0, drizzle_orm_1.eq)(message_translations_schema_1.messageTranslations.targetLanguage, targetLanguage)))
            .limit(1);
        return row;
    }
    async upsertCache(input) {
        await this.db
            .insert(message_translations_schema_1.messageTranslations)
            .values(input)
            .onConflictDoUpdate({
            target: [
                message_translations_schema_1.messageTranslations.messageId,
                message_translations_schema_1.messageTranslations.targetLanguage,
            ],
            set: {
                sourceHash: input.sourceHash,
                sourceText: input.sourceText,
                detectedSourceLanguage: input.detectedSourceLanguage,
                translatedText: input.translatedText,
                provider: input.provider,
                updatedAt: new Date(),
            },
        });
    }
    async resolveChannel(channelId, userId) {
        const channel = this.streamService
            .getClient()
            .channel('messaging', channelId);
        try {
            const response = await channel.query({
                members: { limit: 100 },
                messages: { limit: 1 },
            });
            const members = response.members
                .map((member) => member.user_id)
                .filter((id) => Boolean(id));
            if (!members.includes(userId)) {
                throw new common_1.ForbiddenException('You are not a member of this conversation');
            }
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException)
                throw err;
            this.logger.warn(`Failed to describe channel ${channelId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Conversation ${channelId} not found`);
        }
    }
    async fetchMessage(messageId) {
        try {
            return await this.streamService.getClient().getMessage(messageId);
        }
        catch (err) {
            this.logger.warn(`Failed to fetch message ${messageId}: ${err instanceof Error ? err.message : err}`);
            throw new common_1.NotFoundException(`Message ${messageId} not found`);
        }
    }
    hash(text) {
        return (0, crypto_1.createHash)('sha256').update(text).digest('hex');
    }
};
exports.TranslationService = TranslationService;
exports.TranslationService = TranslationService = TranslationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __param(2, (0, common_1.Inject)(translation_provider_1.TRANSLATION_PROVIDER)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService, Object])
], TranslationService);
//# sourceMappingURL=translation.service.js.map