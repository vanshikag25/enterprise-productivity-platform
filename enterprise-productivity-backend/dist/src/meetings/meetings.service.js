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
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const meetings_schema_1 = require("../database/schema/meetings.schema");
const stream_service_1 = require("../stream/stream.service");
const notifications_service_1 = require("../notifications/notifications.service");
const message_source_service_1 = require("../message-source/message-source.service");
let MeetingsService = MeetingsService_1 = class MeetingsService {
    constructor(db, streamService, notificationsService, messageSourceService) {
        this.db = db;
        this.streamService = streamService;
        this.notificationsService = notificationsService;
        this.messageSourceService = messageSourceService;
        this.logger = new common_1.Logger(MeetingsService_1.name);
    }
    validateTimes(startTime, endTime) {
        if (startTime >= endTime)
            throw new common_1.BadRequestException('endTime must be after startTime');
    }
    async requireMeetingAccess(meeting, userId) {
        const allowed = meeting.organizerId === userId ||
            (Array.isArray(meeting.participants) && meeting.participants.includes(userId));
        if (!allowed) {
            throw new common_1.ForbiddenException('You are not authorized to access this meeting or its chat.');
        }
    }
    async archiveMeetingChat(meeting) {
        if (!meeting.meetingChatChannelId)
            return;
        try {
            const channel = this.streamService
                .getClient()
                .channel('messaging', meeting.meetingChatChannelId);
            await channel.updatePartial({
                set: {
                    frozen: true,
                    archived: true,
                    channel_kind: 'meeting',
                },
            });
        }
        catch (err) {
            this.logger.warn(`Failed to archive meeting chat ${meeting.meetingChatChannelId}: ${err}`);
        }
    }
    buildMeetingUrl(code) {
        return `/meet/${code}`;
    }
    makeMeetingCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i += 1) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return code;
    }
    async generateUniqueMeetingCode() {
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const candidate = this.makeMeetingCode();
            const existing = await this.findOneByCodeInternal(candidate);
            if (!existing) {
                return candidate;
            }
        }
        return `${this.makeMeetingCode()}-${Date.now().toString().slice(-4)}`;
    }
    async meetingsSchemaHasMeetingColumn(columnName) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'meetings'
          AND column_name = ${columnName}
      ) AS has_column
    `);
        const rows = (result.rows ?? []);
        const value = rows[0]?.has_column;
        return (value === true ||
            value === 't' ||
            value === 'true' ||
            String(value).toLowerCase() === 'true');
    }
    async meetingsSchemaHasMeetingUrl() {
        return this.meetingsSchemaHasMeetingColumn('meeting_url');
    }
    async meetingsSchemaHasMeetingCode() {
        return this.meetingsSchemaHasMeetingColumn('meeting_code');
    }
    normalizeMeetingRow(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            title: row.title,
            description: row.description ?? null,
            agenda: row.agenda ?? null,
            notes: row.notes ?? null,
            attachments: Array.isArray(row.attachments) ? row.attachments : [],
            recordingLink: row.recording_link ?? row.recordingLink ?? null,
            meetingCode: row.meeting_code ?? row.meetingCode ?? null,
            meetingUrl: row.meeting_url ?? row.meetingUrl ?? null,
            scheduledDate: row.scheduled_date ?? row.scheduledDate,
            startTime: row.start_time ?? row.startTime,
            endTime: row.end_time ?? row.endTime,
            organizerId: row.organizer_id ?? row.organizerId,
            participants: Array.isArray(row.participants) ? row.participants : [],
            meetingStatus: row.meeting_status ?? row.meetingStatus,
            meetingChatChannelId: row.meeting_chat_channel_id ?? row.meetingChatChannelId ?? null,
            sourceChannelId: row.source_channel_id ?? row.sourceChannelId ?? null,
            sourceMessageId: row.source_message_id ?? row.sourceMessageId ?? null,
            sourceSenderId: row.source_sender_id ?? row.sourceSenderId ?? null,
            sourceChannelName: row.source_channel_name ?? row.sourceChannelName ?? null,
            createdAt: row.created_at ?? row.createdAt,
            updatedAt: row.updated_at ?? row.updatedAt,
        };
    }
    async insertMeetingRecordFallback(values) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO "meetings" (
        "title",
        "description",
        "agenda",
        "notes",
        "attachments",
        "recording_link",
        "scheduled_date",
        "start_time",
        "end_time",
        "organizer_id",
        "participants",
        "meeting_status",
        "meeting_chat_channel_id",
        "source_channel_id",
        "source_message_id",
        "source_sender_id",
        "source_channel_name",
        "created_at",
        "updated_at"
      ) VALUES (
        ${values.title},
        ${values.description},
        ${values.agenda},
        ${values.notes},
        ${JSON.stringify(values.attachments)}::jsonb,
        ${values.recordingLink},
        ${values.scheduledDate},
        ${values.startTime},
        ${values.endTime},
        ${values.organizerId},
        ${JSON.stringify(values.participants)}::jsonb,
        ${values.meetingStatus},
        ${values.meetingChatChannelId},
        ${values.sourceChannelId},
        ${values.sourceMessageId},
        ${values.sourceSenderId},
        ${values.sourceChannelName},
        ${new Date()},
        ${new Date()}
      ) RETURNING *
    `);
        const rows = (result.rows ?? []);
        return this.normalizeMeetingRow(rows[0]);
    }
    async create(userId, dto) {
        this.validateTimes(dto.startTime, dto.endTime);
        const uniqueParticipants = Array.from(new Set([userId, ...dto.participants]));
        const effectiveStatus = dto.meetingStatus ?? 'Scheduled';
        const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
        const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
        const meetingCode = await this.generateUniqueMeetingCode();
        const shareableUrl = dto.meetingUrl ?? this.buildMeetingUrl(meetingCode);
        let meetingChatChannelId = null;
        try {
            const channelData = {
                name: `Meeting: ${dto.title}`,
                members: uniqueParticipants,
                created_by_id: userId,
                channel_kind: 'meeting',
                meeting_id: `meeting-${Date.now()}`,
            };
            const channel = this.streamService
                .getClient()
                .channel('messaging', (0, crypto_1.randomUUID)(), channelData);
            await channel.create();
            meetingChatChannelId = channel.id ?? null;
        }
        catch (err) {
            this.logger.warn(`Failed to create Stream channel for meeting: ${err}`);
        }
        const meetingPayload = {
            title: dto.title,
            description: dto.description ?? null,
            agenda: dto.agenda ?? null,
            notes: dto.notes ?? null,
            attachments: dto.attachments ?? [],
            recordingLink: dto.recordingLink ?? null,
            meetingStatus: effectiveStatus,
            scheduledDate: new Date(dto.scheduledDate),
            startTime: dto.startTime,
            endTime: dto.endTime,
            organizerId: userId,
            participants: uniqueParticipants,
            meetingChatChannelId,
            sourceChannelId: dto.sourceChannelId ?? null,
            sourceMessageId: dto.sourceMessageId ?? null,
            sourceSenderId: dto.sourceSenderId ?? null,
            sourceChannelName: dto.sourceChannelName ?? null,
        };
        const insertPayload = {
            ...meetingPayload,
            ...(supportsMeetingUrl ? { meetingUrl: shareableUrl } : {}),
            ...(supportsMeetingCode ? { meetingCode } : {}),
        };
        const meeting = supportsMeetingUrl || supportsMeetingCode
            ? ((await this.db.execute(supportsMeetingUrl && supportsMeetingCode
                ? (0, drizzle_orm_1.sql) `
                INSERT INTO "meetings" (
                  "title",
                  "description",
                  "agenda",
                  "notes",
                  "attachments",
                  "recording_link",
                  "meeting_code",
                  "meeting_url",
                  "scheduled_date",
                  "start_time",
                  "end_time",
                  "organizer_id",
                  "participants",
                  "meeting_status",
                  "meeting_chat_channel_id",
                  "source_channel_id",
                  "source_message_id",
                  "source_sender_id",
                  "source_channel_name",
                  "created_at",
                  "updated_at"
                ) VALUES (
                  ${meetingPayload.title},
                  ${meetingPayload.description},
                  ${meetingPayload.agenda},
                  ${meetingPayload.notes},
                  ${JSON.stringify(meetingPayload.attachments)}::jsonb,
                  ${meetingPayload.recordingLink},
                  ${meetingCode},
                  ${shareableUrl},
                  ${meetingPayload.scheduledDate},
                  ${meetingPayload.startTime},
                  ${meetingPayload.endTime},
                  ${meetingPayload.organizerId},
                  ${JSON.stringify(meetingPayload.participants)}::jsonb,
                  ${meetingPayload.meetingStatus},
                  ${meetingPayload.meetingChatChannelId},
                  ${meetingPayload.sourceChannelId},
                  ${meetingPayload.sourceMessageId},
                  ${meetingPayload.sourceSenderId},
                  ${meetingPayload.sourceChannelName},
                  ${new Date()},
                  ${new Date()}
                ) RETURNING *
              `
                : supportsMeetingUrl
                    ? (0, drizzle_orm_1.sql) `
                  INSERT INTO "meetings" (
                    "title",
                    "description",
                    "agenda",
                    "notes",
                    "attachments",
                    "recording_link",
                    "meeting_url",
                    "scheduled_date",
                    "start_time",
                    "end_time",
                    "organizer_id",
                    "participants",
                    "meeting_status",
                    "meeting_chat_channel_id",
                    "source_channel_id",
                    "source_message_id",
                    "source_sender_id",
                    "source_channel_name",
                    "created_at",
                    "updated_at"
                  ) VALUES (
                    ${meetingPayload.title},
                    ${meetingPayload.description},
                    ${meetingPayload.agenda},
                    ${meetingPayload.notes},
                    ${JSON.stringify(meetingPayload.attachments)}::jsonb,
                    ${meetingPayload.recordingLink},
                    ${shareableUrl},
                    ${meetingPayload.scheduledDate},
                    ${meetingPayload.startTime},
                    ${meetingPayload.endTime},
                    ${meetingPayload.organizerId},
                    ${JSON.stringify(meetingPayload.participants)}::jsonb,
                    ${meetingPayload.meetingStatus},
                    ${meetingPayload.meetingChatChannelId},
                    ${meetingPayload.sourceChannelId},
                    ${meetingPayload.sourceMessageId},
                    ${meetingPayload.sourceSenderId},
                    ${meetingPayload.sourceChannelName},
                    ${new Date()},
                    ${new Date()}
                  ) RETURNING *
                `
                    : (0, drizzle_orm_1.sql) `
                  INSERT INTO "meetings" (
                    "title",
                    "description",
                    "agenda",
                    "notes",
                    "attachments",
                    "recording_link",
                    "meeting_code",
                    "scheduled_date",
                    "start_time",
                    "end_time",
                    "organizer_id",
                    "participants",
                    "meeting_status",
                    "meeting_chat_channel_id",
                    "source_channel_id",
                    "source_message_id",
                    "source_sender_id",
                    "source_channel_name",
                    "created_at",
                    "updated_at"
                  ) VALUES (
                    ${meetingPayload.title},
                    ${meetingPayload.description},
                    ${meetingPayload.agenda},
                    ${meetingPayload.notes},
                    ${JSON.stringify(meetingPayload.attachments)}::jsonb,
                    ${meetingPayload.recordingLink},
                    ${meetingCode},
                    ${meetingPayload.scheduledDate},
                    ${meetingPayload.startTime},
                    ${meetingPayload.endTime},
                    ${meetingPayload.organizerId},
                    ${JSON.stringify(meetingPayload.participants)}::jsonb,
                    ${meetingPayload.meetingStatus},
                    ${meetingPayload.meetingChatChannelId},
                    ${meetingPayload.sourceChannelId},
                    ${meetingPayload.sourceMessageId},
                    ${meetingPayload.sourceSenderId},
                    ${meetingPayload.sourceChannelName},
                    ${new Date()},
                    ${new Date()}
                  ) RETURNING *
                `)).rows?.map((row) => this.normalizeMeetingRow(row)).find(Boolean) ?? (await this.insertMeetingRecordFallback(meetingPayload)))
            : await this.insertMeetingRecordFallback(meetingPayload);
        let updatedMeeting;
        if (supportsMeetingUrl && supportsMeetingCode) {
            const result = (await this.db.execute((0, drizzle_orm_1.sql) `
          UPDATE "meetings"
          SET "meeting_code" = ${meetingCode}, "meeting_url" = ${shareableUrl}, "updated_at" = ${new Date()}
          WHERE "id" = ${meeting.id}
          RETURNING *
        `));
            updatedMeeting = this.normalizeMeetingRow(result.rows?.[0] ?? null) ?? meeting;
        }
        else if (supportsMeetingUrl) {
            const result = (await this.db.execute((0, drizzle_orm_1.sql) `
          UPDATE "meetings"
          SET "meeting_url" = ${shareableUrl}, "updated_at" = ${new Date()}
          WHERE "id" = ${meeting.id}
          RETURNING *
        `));
            updatedMeeting = this.normalizeMeetingRow(result.rows?.[0] ?? null) ?? meeting;
        }
        else if (supportsMeetingCode) {
            const result = (await this.db.execute((0, drizzle_orm_1.sql) `
          UPDATE "meetings"
          SET "meeting_code" = ${meetingCode}, "updated_at" = ${new Date()}
          WHERE "id" = ${meeting.id}
          RETURNING *
        `));
            updatedMeeting = this.normalizeMeetingRow(result.rows?.[0] ?? null) ?? meeting;
        }
        else {
            updatedMeeting = meeting;
        }
        if (dto.sourceChannelId && dto.sourceMessageId) {
            await this.messageSourceService.confirmSourceMessage({
                channelId: dto.sourceChannelId,
                messageId: dto.sourceMessageId,
                userId,
                confirmationText: `Meeting "${meeting.title}" was created from this conversation.`,
            });
        }
        await this.notificationsService.createMany(uniqueParticipants
            .filter((p) => p !== userId)
            .map((p) => ({
            userId: p,
            type: 'meeting_invitation',
            title: 'Meeting invitation',
            description: String(updatedMeeting.title),
            actionUrl: String(updatedMeeting.meetingUrl ?? '/meetings'),
        })));
        return updatedMeeting;
    }
    async findAllForUser(userId) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM "meetings"`);
        const rows = (result.rows ?? []);
        return rows
            .map((row) => this.normalizeMeetingRow(row))
            .filter((meeting) => Boolean(meeting))
            .filter((meeting) => meeting.organizerId === userId ||
            (Array.isArray(meeting.participants) &&
                meeting.participants.includes(userId)));
    }
    async findAll() {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM "meetings"`);
        const rows = (result.rows ?? []);
        return rows
            .map((row) => this.normalizeMeetingRow(row))
            .filter((meeting) => Boolean(meeting));
    }
    async findOneByCodeInternal(code) {
        const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
        if (supportsMeetingCode) {
            const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM "meetings" WHERE "meeting_code" = ${code} LIMIT 1`);
            const rows = (result.rows ?? []);
            return this.normalizeMeetingRow(rows[0]) ?? null;
        }
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM "meetings" WHERE "meeting_url" = ${this.buildMeetingUrl(code)} LIMIT 1`);
        const rows = (result.rows ?? []);
        return this.normalizeMeetingRow(rows[0]) ?? null;
    }
    async findOne(id) {
        const result = await this.db.execute((0, drizzle_orm_1.sql) `SELECT * FROM "meetings" WHERE "id" = ${id} LIMIT 1`);
        const rows = (result.rows ?? []);
        const meeting = this.normalizeMeetingRow(rows[0]);
        if (!meeting)
            throw new common_1.NotFoundException(`Meeting ${id} not found`);
        return meeting;
    }
    async findOneByCode(code, userId) {
        const meeting = await this.findOneByCodeInternal(code);
        if (!meeting)
            throw new common_1.NotFoundException(`Meeting code ${code} not found`);
        if (userId)
            await this.requireMeetingAccess(meeting, userId);
        return meeting;
    }
    async findOneForUser(id, userId) {
        const meeting = await this.findOne(id);
        await this.requireMeetingAccess(meeting, userId);
        return meeting;
    }
    async update(id, userId, dto) {
        const meeting = await this.findOne(id);
        await this.requireMeetingAccess(meeting, userId);
        if (meeting.organizerId !== userId)
            throw new common_1.ForbiddenException('Only the organizer can edit this meeting');
        if (dto.startTime && dto.endTime)
            this.validateTimes(dto.startTime, dto.endTime);
        const [updated] = await this.db
            .update(meetings_schema_1.meetings)
            .set({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.agenda !== undefined && { agenda: dto.agenda }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.attachments !== undefined && { attachments: dto.attachments }),
            ...(dto.recordingLink !== undefined && { recordingLink: dto.recordingLink }),
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
    async updateStatus(id, userId, status) {
        const meeting = await this.findOne(id);
        await this.requireMeetingAccess(meeting, userId);
        if (meeting.organizerId !== userId)
            throw new common_1.ForbiddenException('Only the organizer can change the meeting status');
        if (!['Scheduled', 'Ongoing', 'Completed', 'Cancelled'].includes(status)) {
            throw new common_1.BadRequestException('Unsupported meeting status');
        }
        const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
        const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
        const updated = supportsMeetingUrl && supportsMeetingCode
            ? (await this.db
                .update(meetings_schema_1.meetings)
                .set({ meetingStatus: status, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id))
                .returning())[0]
            : (await this.db.execute((0, drizzle_orm_1.sql) `
          UPDATE "meetings"
          SET "meeting_status" = ${status}, "updated_at" = ${new Date()}
          WHERE "id" = ${id}
          RETURNING *
        `)).rows?.[0];
        const normalizedUpdated = this.normalizeMeetingRow((updated ?? null)) ?? updated;
        if (status === 'Completed' || status === 'Cancelled') {
            await this.archiveMeetingChat(normalizedUpdated);
        }
        return normalizedUpdated;
    }
    async join(id, userId) {
        const meeting = await this.findOne(id);
        await this.requireMeetingAccess(meeting, userId);
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
        const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
        const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
        const updated = (supportsMeetingUrl && supportsMeetingCode)
            ? (await this.db
                .update(meetings_schema_1.meetings)
                .set({ participants, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id))
                .returning())[0]
            : (await this.db.execute((0, drizzle_orm_1.sql) `
          UPDATE "meetings"
          SET "participants" = ${JSON.stringify(participants)}::jsonb, "updated_at" = ${new Date()}
          WHERE "id" = ${id}
          RETURNING *
        `)).rows?.[0];
        return this.normalizeMeetingRow((updated ?? null)) ?? updated;
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
        const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
        const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
        const updated = (supportsMeetingUrl && supportsMeetingCode)
            ? (await this.db
                .update(meetings_schema_1.meetings)
                .set({ participants, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(meetings_schema_1.meetings.id, id))
                .returning())[0]
            : (await this.db.execute((0, drizzle_orm_1.sql) `
          UPDATE "meetings"
          SET "participants" = ${JSON.stringify(participants)}::jsonb, "updated_at" = ${new Date()}
          WHERE "id" = ${id}
          RETURNING *
        `)).rows?.[0];
        return this.normalizeMeetingRow((updated ?? null)) ?? updated;
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = MeetingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        notifications_service_1.NotificationsService,
        message_source_service_1.MessageSourceService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map