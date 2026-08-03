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
var MeetingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const meetings_schema_1 = require("../database/schema/meetings.schema");
const stream_service_1 = require("../stream/stream.service");
const notifications_service_1 = require("../notifications/notifications.service");
let MeetingsService = MeetingsService_1 = class MeetingsService {
    constructor(db, streamService, notificationsService) {
        this.db = db;
        this.streamService = streamService;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(MeetingsService_1.name);
    }
    validateTimes(startTime, endTime) {
        if (startTime >= endTime)
            throw new common_1.BadRequestException('endTime must be after startTime');
    }
    async create(userId, dto) {
        this.validateTimes(dto.startTime, dto.endTime);
        const uniqueParticipants = Array.from(new Set([userId, ...dto.participants]));
        let meetingChatChannelId = null;
        try {
            const channelData = {
                name: `Meeting: ${dto.title}`,
                members: uniqueParticipants,
                created_by_id: userId,
            };
            const channel = this.streamService
                .getClient()
                .channel('messaging', channelData);
            await channel.create();
            meetingChatChannelId = channel.id ?? null;
        }
        catch (err) {
            this.logger.warn(`Failed to create Stream channel for meeting: ${err}`);
        }
        const [meeting] = await this.db
            .insert(meetings_schema_1.meetings)
            .values({
            title: dto.title,
            description: dto.description ?? null,
            scheduledDate: new Date(dto.scheduledDate),
            startTime: dto.startTime,
            endTime: dto.endTime,
            organizerId: userId,
            participants: uniqueParticipants,
            meetingChatChannelId,
        })
            .returning();
        await this.notificationsService.createMany(uniqueParticipants
            .filter((p) => p !== userId)
            .map((p) => ({
            userId: p,
            type: 'meeting_invitation',
            title: 'Meeting invitation',
            description: meeting.title,
            actionUrl: '/meetings',
        })));
        return meeting;
    }
    async findAll() {
        return this.db.select().from(meetings_schema_1.meetings);
    }
    async findOne(id) {
        const [meeting] = await this.db
            .select()
            .from(meetings_schema_1.meetings)
            .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id));
        if (!meeting)
            throw new common_1.NotFoundException(`Meeting ${id} not found`);
        return meeting;
    }
    async update(id, userId, dto) {
        const meeting = await this.findOne(id);
        if (meeting.organizerId !== userId)
            throw new common_1.ForbiddenException('Only the organizer can edit this meeting');
        if (dto.startTime && dto.endTime)
            this.validateTimes(dto.startTime, dto.endTime);
        const [updated] = await this.db
            .update(meetings_schema_1.meetings)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.scheduledDate !== undefined && {
                scheduledDate: new Date(dto.scheduledDate),
            }),
            ...(dto.startTime !== undefined && { startTime: dto.startTime }),
            ...(dto.endTime !== undefined && { endTime: dto.endTime }),
            ...(dto.participants !== undefined && {
                participants: Array.from(new Set([meeting.organizerId, ...dto.participants])),
            }),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id))
            .returning();
        await this.notificationsService.createMany(updated.participants
            .filter((p) => p !== userId)
            .map((p) => ({
            userId: p,
            type: 'meeting_updated',
            title: 'Meeting updated',
            description: updated.title,
            actionUrl: '/meetings',
        })));
        return updated;
    }
    async remove(id, userId) {
        const meeting = await this.findOne(id);
        if (meeting.organizerId !== userId)
            throw new common_1.ForbiddenException('Only the organizer can delete this meeting');
        await this.db.delete(meetings_schema_1.meetings).where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id));
    }
    async join(id, userId) {
        const meeting = await this.findOne(id);
        const participants = meeting.participants.includes(userId)
            ? meeting.participants
            : [...meeting.participants, userId];
        if (meeting.meetingChatChannelId) {
            try {
                await this.streamService
                    .getClient()
                    .channel('messaging', meeting.meetingChatChannelId)
                    .addMembers([userId]);
            }
            catch (err) {
                this.logger.warn(`Failed to add member to meeting channel: ${err}`);
            }
        }
        const [updated] = await this.db
            .update(meetings_schema_1.meetings)
            .set({ participants, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id))
            .returning();
        return updated;
    }
    async leave(id, userId) {
        const meeting = await this.findOne(id);
        if (userId === meeting.organizerId)
            throw new common_1.BadRequestException('Organizer cannot leave their own meeting');
        const participants = meeting.participants.filter((p) => p !== userId);
        if (meeting.meetingChatChannelId) {
            try {
                await this.streamService
                    .getClient()
                    .channel('messaging', meeting.meetingChatChannelId)
                    .removeMembers([userId]);
            }
            catch (err) {
                this.logger.warn(`Failed to remove member from meeting channel: ${err}`);
            }
        }
        const [updated] = await this.db
            .update(meetings_schema_1.meetings)
            .set({ participants, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id))
            .returning();
        return updated;
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = MeetingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        notifications_service_1.NotificationsService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map