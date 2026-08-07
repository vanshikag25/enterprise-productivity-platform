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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarksService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const message_actions_schema_1 = require("../database/schema/message-actions.schema");
let BookmarksService = class BookmarksService {
    constructor(db) {
        this.db = db;
    }
    async create(userId, dto) {
        const existing = await this.findByMessage(userId, dto.sourceMessageId);
        if (existing)
            return existing;
        const [bookmark] = await this.db
            .insert(message_actions_schema_1.messageBookmarks)
            .values({
            userId,
            sourceChannelId: dto.sourceChannelId,
            sourceMessageId: dto.sourceMessageId,
            sourceSenderId: dto.sourceSenderId ?? null,
            sourceChannelName: dto.sourceChannelName ?? null,
            sourceMessageText: dto.sourceMessageText ?? null,
            sourceSenderName: dto.sourceSenderName ?? null,
        })
            .returning();
        return bookmark;
    }
    async findAll(userId, filters = {}) {
        const conditions = [
            (0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.userId, userId),
        ];
        if (filters.channelId) {
            conditions.push((0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.sourceChannelId, filters.channelId));
        }
        if (filters.search && filters.search.trim()) {
            const term = filters.search.trim();
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${message_actions_schema_1.messageBookmarks.sourceMessageText} ILIKE ${`%${term}%`}`, (0, drizzle_orm_1.sql) `${message_actions_schema_1.messageBookmarks.sourceSenderName} ILIKE ${`%${term}%`}`, (0, drizzle_orm_1.sql) `${message_actions_schema_1.messageBookmarks.sourceChannelName} ILIKE ${`%${term}%`}`));
        }
        return this.db
            .select()
            .from(message_actions_schema_1.messageBookmarks)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(message_actions_schema_1.messageBookmarks.createdAt));
    }
    async findByMessage(userId, messageId) {
        const [bookmark] = await this.db
            .select()
            .from(message_actions_schema_1.messageBookmarks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.userId, userId), (0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.sourceMessageId, messageId)));
        return bookmark ?? null;
    }
    async findOne(id, userId) {
        const [bookmark] = await this.db
            .select()
            .from(message_actions_schema_1.messageBookmarks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.userId, userId)));
        if (!bookmark)
            throw new common_1.NotFoundException(`Bookmark ${id} not found`);
        return bookmark;
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        await this.db
            .delete(message_actions_schema_1.messageBookmarks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.messageBookmarks.userId, userId)));
    }
};
exports.BookmarksService = BookmarksService;
exports.BookmarksService = BookmarksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], BookmarksService);
//# sourceMappingURL=bookmarks.service.js.map