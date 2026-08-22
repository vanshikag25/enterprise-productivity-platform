import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ChannelData } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import { meetings, Meeting } from '../database/schema/meetings.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageSourceService } from '../message-source/message-source.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly notificationsService: NotificationsService,
    private readonly messageSourceService: MessageSourceService,
  ) {}

  private validateTimes(startTime: string, endTime: string) {
    if (startTime >= endTime)
      throw new BadRequestException('endTime must be after startTime');
  }

  private async requireMeetingAccess(meeting: Meeting, userId: string) {
    const allowed =
      meeting.organizerId === userId ||
      (Array.isArray(meeting.participants) && meeting.participants.includes(userId));
    if (!allowed) {
      throw new ForbiddenException(
        'You are not authorized to access this meeting or its chat.',
      );
    }
  }

  private async archiveMeetingChat(meeting: Meeting) {
    if (!meeting.meetingChatChannelId) return;
    try {
      const channel = this.streamService
        .getClient()
        .channel('messaging', meeting.meetingChatChannelId);
      await channel.updatePartial({
        set: {
          frozen: true,
          archived: true,
          channel_kind: 'meeting',
        } as unknown as Parameters<typeof channel.updatePartial>[0]['set'],
      });
    } catch (err) {
      this.logger.warn(`Failed to archive meeting chat ${meeting.meetingChatChannelId}: ${err}`);
    }
  }

  private buildMeetingUrl(code: string): string {
    return `/meet/${code}`;
  }

  private makeMeetingCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  private async generateUniqueMeetingCode(): Promise<string> {
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

  private async meetingsSchemaHasMeetingColumn(columnName: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'meetings'
          AND column_name = ${columnName}
      ) AS has_column
    `);

    const rows = (((result as unknown) as {
      rows?: Array<{ has_column?: boolean | string }>;
    }).rows ?? []) as Array<{ has_column?: boolean | string }>;

    const value = rows[0]?.has_column;
    return (
      value === true ||
      value === 't' ||
      value === 'true' ||
      String(value).toLowerCase() === 'true'
    );
  }

  private async meetingsSchemaHasMeetingUrl(): Promise<boolean> {
    return this.meetingsSchemaHasMeetingColumn('meeting_url');
  }

  private async meetingsSchemaHasMeetingCode(): Promise<boolean> {
    return this.meetingsSchemaHasMeetingColumn('meeting_code');
  }

  private normalizeMeetingRow(row: Record<string, any> | null | undefined): Meeting | null {
    if (!row) return null;

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
      meetingChatChannelId:
        row.meeting_chat_channel_id ?? row.meetingChatChannelId ?? null,
      sourceChannelId: row.source_channel_id ?? row.sourceChannelId ?? null,
      sourceMessageId: row.source_message_id ?? row.sourceMessageId ?? null,
      sourceSenderId: row.source_sender_id ?? row.sourceSenderId ?? null,
      sourceChannelName:
        row.source_channel_name ?? row.sourceChannelName ?? null,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    } as Meeting;
  }

  private async insertMeetingRecordFallback(values: {
    title: string;
    description: string | null;
    agenda: string | null;
    notes: string | null;
    attachments: string[];
    recordingLink: string | null;
    meetingCode?: string | null;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    organizerId: string;
    participants: string[];
    meetingStatus: Meeting['meetingStatus'];
    meetingChatChannelId: string | null;
    sourceChannelId: string | null;
    sourceMessageId: string | null;
    sourceSenderId: string | null;
    sourceChannelName: string | null;
  }): Promise<Meeting> {
    const result = await this.db.execute(sql`
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

    const rows = (((result as unknown) as { rows?: Record<string, any>[] }).rows ?? []) as Record<string, any>[];
    return this.normalizeMeetingRow(rows[0]) as Meeting;
  }

  async create(userId: string, dto: CreateMeetingDto): Promise<Meeting> {
    this.validateTimes(dto.startTime, dto.endTime);

    const uniqueParticipants = Array.from(
      new Set([userId, ...dto.participants]),
    );
    const effectiveStatus = dto.meetingStatus ?? 'Scheduled';
    const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
    const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
    const meetingCode = await this.generateUniqueMeetingCode();
    const shareableUrl = dto.meetingUrl ?? this.buildMeetingUrl(meetingCode);
    let meetingChatChannelId: string | null = null;

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
        .channel(
          'messaging',
          randomUUID(),
          channelData as unknown as ChannelData,
        );
      await channel.create();
      meetingChatChannelId = channel.id ?? null;
    } catch (err) {
      this.logger.warn(`Failed to create Stream channel for meeting: ${err}`);
    }

    const meetingPayload = {
      title: dto.title,
      description: dto.description ?? null,
      agenda: dto.agenda ?? null,
      notes: dto.notes ?? null,
      attachments: dto.attachments ?? [],
      recordingLink: dto.recordingLink ?? null,
      meetingStatus: effectiveStatus as Meeting['meetingStatus'],
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
      ? (((await this.db.execute(
          supportsMeetingUrl && supportsMeetingCode
            ? sql`
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
              ? sql`
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
              : sql`
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
                `
        )) as unknown as { rows?: Record<string, any>[] }).rows?.map((row) => this.normalizeMeetingRow(row)).find(Boolean) ?? (await this.insertMeetingRecordFallback(meetingPayload)))
      : await this.insertMeetingRecordFallback(meetingPayload);

    let updatedMeeting: Meeting;

    if (supportsMeetingUrl && supportsMeetingCode) {
      const result = ((await this.db.execute(sql`
          UPDATE "meetings"
          SET "meeting_code" = ${meetingCode}, "meeting_url" = ${shareableUrl}, "updated_at" = ${new Date()}
          WHERE "id" = ${meeting.id}
          RETURNING *
        `)) as unknown as { rows?: Record<string, any>[] });
      updatedMeeting = this.normalizeMeetingRow(result.rows?.[0] ?? null) ?? meeting;
    } else if (supportsMeetingUrl) {
      const result = ((await this.db.execute(sql`
          UPDATE "meetings"
          SET "meeting_url" = ${shareableUrl}, "updated_at" = ${new Date()}
          WHERE "id" = ${meeting.id}
          RETURNING *
        `)) as unknown as { rows?: Record<string, any>[] });
      updatedMeeting = this.normalizeMeetingRow(result.rows?.[0] ?? null) ?? meeting;
    } else if (supportsMeetingCode) {
      const result = ((await this.db.execute(sql`
          UPDATE "meetings"
          SET "meeting_code" = ${meetingCode}, "updated_at" = ${new Date()}
          WHERE "id" = ${meeting.id}
          RETURNING *
        `)) as unknown as { rows?: Record<string, any>[] });
      updatedMeeting = this.normalizeMeetingRow(result.rows?.[0] ?? null) ?? meeting;
    } else {
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

    await this.notificationsService.createMany(
      uniqueParticipants
        .filter((p) => p !== userId)
        .map((p) => ({
          userId: p,
          type: 'meeting_invitation',
          title: 'Meeting invitation',
          description: String(updatedMeeting.title),
          actionUrl: String(updatedMeeting.meetingUrl ?? '/meetings'),
        })),
    );

    return updatedMeeting as Meeting;
  }

  async findAllForUser(userId: string): Promise<Meeting[]> {
    const result = await this.db.execute(sql`SELECT * FROM "meetings"`);
    const rows = (((result as unknown) as { rows?: Record<string, any>[] }).rows ?? []) as Record<string, any>[];
    return rows
      .map((row) => this.normalizeMeetingRow(row))
      .filter((meeting): meeting is Meeting => Boolean(meeting))
      .filter(
        (meeting) =>
          meeting.organizerId === userId ||
          (Array.isArray(meeting.participants) &&
            meeting.participants.includes(userId)),
      );
  }

  async findAll(): Promise<Meeting[]> {
    const result = await this.db.execute(sql`SELECT * FROM "meetings"`);
    const rows = (((result as unknown) as { rows?: Record<string, any>[] }).rows ?? []) as Record<string, any>[];
    return rows
      .map((row) => this.normalizeMeetingRow(row))
      .filter((meeting): meeting is Meeting => Boolean(meeting));
  }

  private async findOneByCodeInternal(code: string): Promise<Meeting | null> {
    const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
    if (supportsMeetingCode) {
      const result = await this.db.execute(
        sql`SELECT * FROM "meetings" WHERE "meeting_code" = ${code} LIMIT 1`,
      );
      const rows = (((result as unknown) as { rows?: Record<string, any>[] }).rows ?? []) as Record<string, any>[];
      return this.normalizeMeetingRow(rows[0]) ?? null;
    }

    const result = await this.db.execute(
      sql`SELECT * FROM "meetings" WHERE "meeting_url" = ${this.buildMeetingUrl(code)} LIMIT 1`,
    );
    const rows = (((result as unknown) as { rows?: Record<string, any>[] }).rows ?? []) as Record<string, any>[];
    return this.normalizeMeetingRow(rows[0]) ?? null;
  }

  async findOne(id: string): Promise<Meeting> {
    const result = await this.db.execute(
      sql`SELECT * FROM "meetings" WHERE "id" = ${id} LIMIT 1`,
    );
    const rows = (((result as unknown) as { rows?: Record<string, any>[] }).rows ?? []) as Record<string, any>[];
    const meeting = this.normalizeMeetingRow(rows[0]);
    if (!meeting) throw new NotFoundException(`Meeting ${id} not found`);
    return meeting;
  }

  async findOneByCode(code: string, userId?: string): Promise<Meeting> {
    const meeting = await this.findOneByCodeInternal(code);
    if (!meeting) throw new NotFoundException(`Meeting code ${code} not found`);
    if (userId) await this.requireMeetingAccess(meeting, userId);
    return meeting;
  }

  async findOneForUser(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOne(id);
    await this.requireMeetingAccess(meeting, userId);
    return meeting;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMeetingDto,
  ): Promise<Meeting> {
    const meeting = await this.findOne(id);
    await this.requireMeetingAccess(meeting, userId);
    if (meeting.organizerId !== userId)
      throw new ForbiddenException('Only the organizer can edit this meeting');
    if (dto.startTime && dto.endTime)
      this.validateTimes(dto.startTime, dto.endTime);

    const [updated] = await this.db
      .update(meetings)
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
          participants: Array.from(
            new Set([meeting.organizerId, ...dto.participants]),
          ),
        }),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, id))
      .returning();

    await this.notificationsService.createMany(
      updated.participants
        .filter((p) => p !== userId)
        .map((p) => ({
          userId: p,
          type: 'meeting_updated',
          title: 'Meeting updated',
          description: updated.title,
          actionUrl: '/meetings',
        })),
    );

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const meeting = await this.findOne(id);
    if (meeting.organizerId !== userId)
      throw new ForbiddenException(
        'Only the organizer can delete this meeting',
      );
    await this.db.delete(meetings).where(eq(meetings.id, id));
  }

  async updateStatus(id: string, userId: string, status: string): Promise<Meeting> {
    const meeting = await this.findOne(id);
    await this.requireMeetingAccess(meeting, userId);
    if (meeting.organizerId !== userId)
      throw new ForbiddenException(
        'Only the organizer can change the meeting status',
      );

    if (!['Scheduled', 'Ongoing', 'Completed', 'Cancelled'].includes(status)) {
      throw new BadRequestException('Unsupported meeting status');
    }

    const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
    const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
    const updated = supportsMeetingUrl && supportsMeetingCode
      ? (
          await this.db
            .update(meetings)
            .set({ meetingStatus: status as Meeting['meetingStatus'], updatedAt: new Date() })
            .where(eq(meetings.id, id))
            .returning()
        )[0]
      : ((await this.db.execute(sql`
          UPDATE "meetings"
          SET "meeting_status" = ${status}, "updated_at" = ${new Date()}
          WHERE "id" = ${id}
          RETURNING *
        `)) as unknown as { rows?: Record<string, any>[] }).rows?.[0] as Meeting;

    const normalizedUpdated = this.normalizeMeetingRow((updated ?? null) as Record<string, any> | null) ?? (updated as Meeting);

    if (status === 'Completed' || status === 'Cancelled') {
      await this.archiveMeetingChat(normalizedUpdated);
    }

    return normalizedUpdated;
  }

  async join(id: string, userId: string): Promise<Meeting> {
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
      } catch (err) {
        this.logger.warn(`Failed to add member to meeting channel: ${err}`);
      }
    }

    const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
    const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
    const updated = (supportsMeetingUrl && supportsMeetingCode)
      ? (
          await this.db
            .update(meetings)
            .set({ participants, updatedAt: new Date() })
            .where(eq(meetings.id, id))
            .returning()
        )[0]
      : ((await this.db.execute(sql`
          UPDATE "meetings"
          SET "participants" = ${JSON.stringify(participants)}::jsonb, "updated_at" = ${new Date()}
          WHERE "id" = ${id}
          RETURNING *
        `)) as unknown as { rows?: Record<string, any>[] }).rows?.[0] as Meeting;

    return this.normalizeMeetingRow((updated ?? null) as Record<string, any> | null) ?? (updated as Meeting);
  }

  async leave(id: string, userId: string): Promise<Meeting> {
    const meeting = await this.findOne(id);
    if (userId === meeting.organizerId)
      throw new BadRequestException('Organizer cannot leave their own meeting');
    const participants = meeting.participants.filter((p) => p !== userId);

    if (meeting.meetingChatChannelId) {
      try {
        await this.streamService
          .getClient()
          .channel('messaging', meeting.meetingChatChannelId)
          .removeMembers([userId]);
      } catch (err) {
        this.logger.warn(
          `Failed to remove member from meeting channel: ${err}`,
        );
      }
    }

    const supportsMeetingUrl = await this.meetingsSchemaHasMeetingUrl();
    const supportsMeetingCode = await this.meetingsSchemaHasMeetingCode();
    const updated = (supportsMeetingUrl && supportsMeetingCode)
      ? (
          await this.db
            .update(meetings)
            .set({ participants, updatedAt: new Date() })
            .where(eq(meetings.id, id))
            .returning()
        )[0]
      : ((await this.db.execute(sql`
          UPDATE "meetings"
          SET "participants" = ${JSON.stringify(participants)}::jsonb, "updated_at" = ${new Date()}
          WHERE "id" = ${id}
          RETURNING *
        `)) as unknown as { rows?: Record<string, any>[] }).rows?.[0] as Meeting;

    return this.normalizeMeetingRow((updated ?? null) as Record<string, any> | null) ?? (updated as Meeting);
  }
}
