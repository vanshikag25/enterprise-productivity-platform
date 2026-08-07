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
exports.NotesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const message_actions_schema_1 = require("../database/schema/message-actions.schema");
let NotesService = class NotesService {
    constructor(db) {
        this.db = db;
    }
    async create(userId, dto) {
        const [note] = await this.db
            .insert(message_actions_schema_1.userNotes)
            .values({
            userId,
            title: dto.title,
            content: dto.content,
            sourceChannelId: dto.sourceChannelId ?? null,
            sourceMessageId: dto.sourceMessageId ?? null,
            sourceSenderId: dto.sourceSenderId ?? null,
            sourceChannelName: dto.sourceChannelName ?? null,
            sourceMessageText: dto.sourceMessageText ?? null,
        })
            .returning();
        return note;
    }
    async findAll(userId, search) {
        const conditions = [(0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.userId, userId)];
        if (search && search.trim()) {
            const term = search.trim();
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${message_actions_schema_1.userNotes.title} ILIKE ${`%${term}%`}`, (0, drizzle_orm_1.sql) `${message_actions_schema_1.userNotes.content} ILIKE ${`%${term}%`}`));
        }
        return this.db
            .select()
            .from(message_actions_schema_1.userNotes)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(message_actions_schema_1.userNotes.updatedAt));
    }
    async findOne(id, userId) {
        const [note] = await this.db
            .select()
            .from(message_actions_schema_1.userNotes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.userId, userId)));
        if (!note)
            throw new common_1.NotFoundException(`Note ${id} not found`);
        return note;
    }
    async update(id, userId, dto) {
        await this.findOne(id, userId);
        const [updated] = await this.db
            .update(message_actions_schema_1.userNotes)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.content !== undefined && { content: dto.content }),
            ...(dto.sourceChannelId !== undefined && {
                sourceChannelId: dto.sourceChannelId,
            }),
            ...(dto.sourceMessageId !== undefined && {
                sourceMessageId: dto.sourceMessageId,
            }),
            ...(dto.sourceSenderId !== undefined && {
                sourceSenderId: dto.sourceSenderId,
            }),
            ...(dto.sourceChannelName !== undefined && {
                sourceChannelName: dto.sourceChannelName,
            }),
            ...(dto.sourceMessageText !== undefined && {
                sourceMessageText: dto.sourceMessageText,
            }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.userId, userId)))
            .returning();
        return updated;
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        await this.db
            .delete(message_actions_schema_1.userNotes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.userNotes.userId, userId)));
    }
};
exports.NotesService = NotesService;
exports.NotesService = NotesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], NotesService);
//# sourceMappingURL=notes.service.js.map