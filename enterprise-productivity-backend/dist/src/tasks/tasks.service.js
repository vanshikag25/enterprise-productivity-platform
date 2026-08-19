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
var TasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const tasks_schema_1 = require("../database/schema/tasks.schema");
const stream_service_1 = require("../stream/stream.service");
const notifications_service_1 = require("../notifications/notifications.service");
let TasksService = TasksService_1 = class TasksService {
    constructor(db, streamService, notificationsService) {
        this.db = db;
        this.streamService = streamService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(TasksService_1.name);
    }
    async create(userId, dto) {
        let streamChannelId = null;
        try {
            streamChannelId = await this.createTaskChannel(userId, dto.title, dto.assignee);
        }
        catch (err) {
            this.logger.warn(`Failed to create Stream channel for task: ${err}`);
        }
        const [task] = await this.db
            .insert(tasks_schema_1.tasks)
            .values({
            title: dto.title,
            description: dto.description ?? null,
            status: dto.status ?? 'Todo',
            priority: dto.priority ?? 'Medium',
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            createdBy: userId,
            assignee: dto.assignee ?? null,
            streamChannelId,
            sourceChannelId: dto.sourceChannelId ?? null,
            sourceMessageId: dto.sourceMessageId ?? null,
            sourceSenderId: dto.sourceSenderId ?? null,
            sourceChannelName: dto.sourceChannelName ?? null,
        })
            .returning();
        if (dto.sourceChannelId && dto.sourceMessageId) {
            await this.linkSourceMessage(task, dto);
        }
        if (task.assignee && task.assignee !== userId) {
            await this.notificationsService.create({
                userId: task.assignee,
                type: 'task_assigned',
                title: 'New task assigned',
                description: task.title,
                actionUrl: '/tasks',
            });
        }
        return task;
    }
    async linkSourceMessage(task, dto) {
        const client = this.streamService.getClient();
        const { sourceChannelId, sourceMessageId } = dto;
        if (!sourceChannelId || !sourceMessageId)
            return;
        try {
            const { message } = await client.getMessage(sourceMessageId);
            if (message.channel?.id && message.channel.id !== sourceChannelId) {
                this.logger.warn(`Message ${sourceMessageId} does not belong to channel ${sourceChannelId}; skipping link.`);
                return;
            }
            await client.partialUpdateMessage(sourceMessageId, {
                set: {
                    linked_task_id: task.id,
                    linked_task_title: task.title,
                },
            });
            const channel = client.channel('messaging', sourceChannelId);
            await channel.sendMessage({
                text: `Task "${task.title}" was created from this conversation.`,
                user_id: task.createdBy,
            });
        }
        catch (err) {
            this.logger.warn(`Failed to link message ${sourceMessageId}: ${err}`);
        }
    }
    async findBySourceMessage(messageId) {
        const [task] = await this.db
            .select()
            .from(tasks_schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(tasks_schema_1.tasks.sourceMessageId, messageId));
        return task ?? null;
    }
    async findAll() {
        return this.db.select().from(tasks_schema_1.tasks);
    }
    async findOne(id) {
        const [task] = await this.db.select().from(tasks_schema_1.tasks).where((0, drizzle_orm_1.eq)(tasks_schema_1.tasks.id, id));
        if (!task)
            throw new common_1.NotFoundException(`Task ${id} not found`);
        return task;
    }
    async getOrCreateChannel(id, userId) {
        const task = await this.findOne(id);
        if (task.createdBy !== userId && task.assignee !== userId) {
            throw new common_1.ForbiddenException('Only the task creator or assignee can open this discussion');
        }
        if (task.streamChannelId) {
            try {
                const existing = await this.streamService
                    .getClient()
                    .queryChannels({ id: task.streamChannelId });
                if (existing.length > 0) {
                    return { channelId: task.streamChannelId };
                }
            }
            catch (err) {
                this.logger.warn(`Failed to verify task channel ${task.streamChannelId}: ${err}`);
            }
        }
        const channelId = await this.createTaskChannel(task.createdBy, task.title, task.assignee ?? undefined);
        await this.db
            .update(tasks_schema_1.tasks)
            .set({ streamChannelId: channelId, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(tasks_schema_1.tasks.id, id));
        return { channelId };
    }
    async createTaskChannel(createdBy, title, assignee) {
        const members = Array.from(new Set([createdBy, ...(assignee ? [assignee] : [])]));
        const channelData = {
            name: `Task: ${title}`,
            members,
            created_by_id: createdBy,
            channel_kind: 'task',
        };
        const channel = this.streamService
            .getClient()
            .channel('messaging', (0, crypto_1.randomUUID)(), channelData);
        await channel.create();
        const channelId = channel.id ?? null;
        if (!channelId)
            throw new Error('Stream did not return a channel id after create.');
        return channelId;
    }
    async update(id, userId, dto) {
        const task = await this.findOne(id);
        if (task.createdBy !== userId)
            throw new common_1.ForbiddenException('Only the creator can edit this task');
        const [updated] = await this.db
            .update(tasks_schema_1.tasks)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.status !== undefined && {
                status: dto.status,
            }),
            ...(dto.priority !== undefined && {
                priority: dto.priority,
            }),
            ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
            ...(dto.assignee !== undefined && { assignee: dto.assignee }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(tasks_schema_1.tasks.id, id))
            .returning();
        if (updated.assignee && updated.assignee !== userId) {
            await this.notificationsService.create({
                userId: updated.assignee,
                type: 'task_updated',
                title: 'Task updated',
                description: updated.title,
                actionUrl: '/tasks',
            });
        }
        return updated;
    }
    async updateStatus(id, userId, status) {
        const task = await this.findOne(id);
        if (task.createdBy !== userId && task.assignee !== userId) {
            throw new common_1.ForbiddenException('Only the creator or assignee can update status');
        }
        const [updated] = await this.db
            .update(tasks_schema_1.tasks)
            .set({ status: status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(tasks_schema_1.tasks.id, id))
            .returning();
        const isFinalStatus = status === 'Completed' || status === 'Closed';
        const becameFinal = isFinalStatus && task.status !== status;
        if (becameFinal) {
            if (updated.streamChannelId) {
                try {
                    const channel = this.streamService
                        .getClient()
                        .channel('messaging', updated.streamChannelId);
                    await channel.updatePartial({
                        set: {
                            frozen: true,
                            archived: true,
                        },
                    });
                }
                catch (err) {
                    this.logger.warn(`Failed to archive task channel: ${err}`);
                }
            }
            const participants = Array.from(new Set([
                updated.createdBy,
                ...(updated.assignee ? [updated.assignee] : []),
            ])).filter((participant) => participant !== userId);
            if (participants.length > 0) {
                await this.notificationsService.createMany(participants.map((participant) => ({
                    userId: participant,
                    type: 'task_updated',
                    title: status === 'Closed' ? 'Task closed' : 'Task completed',
                    description: updated.title,
                    actionUrl: '/tasks',
                })));
            }
            return updated;
        }
        const otherParty = userId === updated.createdBy ? updated.assignee : updated.createdBy;
        if (otherParty) {
            await this.notificationsService.create({
                userId: otherParty,
                type: 'task_updated',
                title: 'Task status changed',
                description: `${updated.title} — ${status}`,
                actionUrl: '/tasks',
            });
        }
        return updated;
    }
    async remove(id, userId) {
        const task = await this.findOne(id);
        if (task.createdBy !== userId)
            throw new common_1.ForbiddenException('Only the creator can delete this task');
        await this.db.delete(tasks_schema_1.tasks).where((0, drizzle_orm_1.eq)(tasks_schema_1.tasks.id, id));
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = TasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map