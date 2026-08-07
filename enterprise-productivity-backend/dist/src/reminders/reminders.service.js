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
exports.RemindersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const message_actions_schema_1 = require("../database/schema/message-actions.schema");
const notifications_service_1 = require("../notifications/notifications.service");
let RemindersService = class RemindersService {
    constructor(db, notificationsService) {
        this.db = db;
        this.notificationsService = notificationsService;
    }
    async create(userId, dto) {
        const [reminder] = await this.db
            .insert(message_actions_schema_1.reminders)
            .values({
            userId,
            title: dto.title,
            scheduledFor: new Date(dto.scheduledFor),
            priority: dto.priority ?? 'Medium',
            notes: dto.notes ?? null,
            sourceChannelId: dto.sourceChannelId ?? null,
            sourceMessageId: dto.sourceMessageId ?? null,
            sourceSenderId: dto.sourceSenderId ?? null,
            sourceChannelName: dto.sourceChannelName ?? null,
        })
            .returning();
        return reminder;
    }
    async findAll(userId, includeTriggered = false) {
        const conditions = [(0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.userId, userId)];
        if (!includeTriggered)
            conditions.push((0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.isTriggered, false));
        return this.db
            .select()
            .from(message_actions_schema_1.reminders)
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.asc)(message_actions_schema_1.reminders.scheduledFor));
    }
    async findOne(id, userId) {
        const [reminder] = await this.db
            .select()
            .from(message_actions_schema_1.reminders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.userId, userId)));
        if (!reminder)
            throw new common_1.NotFoundException(`Reminder ${id} not found`);
        return reminder;
    }
    async update(id, userId, dto) {
        await this.findOne(id, userId);
        const [updated] = await this.db
            .update(message_actions_schema_1.reminders)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.scheduledFor !== undefined && {
                scheduledFor: new Date(dto.scheduledFor),
            }),
            ...(dto.priority !== undefined && {
                priority: dto.priority,
            }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
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
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.userId, userId)))
            .returning();
        return updated;
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        await this.db
            .delete(message_actions_schema_1.reminders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.id, id), (0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.userId, userId)));
    }
    async trigger(id, userId) {
        const reminder = await this.findOne(id, userId);
        if (reminder.isTriggered)
            return reminder;
        const actionUrl = reminder.sourceChannelId && reminder.sourceMessageId
            ? `/dashboard?channel=${encodeURIComponent(reminder.sourceChannelId)}&message=${encodeURIComponent(reminder.sourceMessageId)}`
            : '/reminders';
        await this.notificationsService.create({
            userId,
            type: 'reminder',
            title: `Reminder: ${reminder.title}`,
            description: reminder.notes ?? `Scheduled for ${reminder.scheduledFor.toISOString()}`,
            actionUrl,
        });
        const [updated] = await this.db
            .update(message_actions_schema_1.reminders)
            .set({ isTriggered: true, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(message_actions_schema_1.reminders.id, id))
            .returning();
        return updated;
    }
};
exports.RemindersService = RemindersService;
exports.RemindersService = RemindersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        notifications_service_1.NotificationsService])
], RemindersService);
//# sourceMappingURL=reminders.service.js.map