import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
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

  async create(userId: string, dto: CreateMeetingDto): Promise<Meeting> {
    this.validateTimes(dto.startTime, dto.endTime);

    const uniqueParticipants = Array.from(
      new Set([userId, ...dto.participants]),
    );
    let meetingChatChannelId: string | null = null;

    try {
      const channelData = {
        name: `Meeting: ${dto.title}`,
        members: uniqueParticipants,
        created_by_id: userId,
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

    const [meeting] = await this.db
      .insert(meetings)
      .values({
        title: dto.title,
        description: dto.description ?? null,
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
      })
      .returning();

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
          description: meeting.title,
          actionUrl: '/meetings',
        })),
    );

    return meeting;
  }

  async findAll(): Promise<Meeting[]> {
    return this.db.select().from(meetings);
  }

  async findOne(id: string): Promise<Meeting> {
    const [meeting] = await this.db
      .select()
      .from(meetings)
      .where(eq(meetings.id, id));
    if (!meeting) throw new NotFoundException(`Meeting ${id} not found`);
    return meeting;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMeetingDto,
  ): Promise<Meeting> {
    const meeting = await this.findOne(id);
    if (meeting.organizerId !== userId)
      throw new ForbiddenException('Only the organizer can edit this meeting');
    if (dto.startTime && dto.endTime)
      this.validateTimes(dto.startTime, dto.endTime);

    const [updated] = await this.db
      .update(meetings)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
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

  async join(id: string, userId: string): Promise<Meeting> {
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
      } catch (err) {
        this.logger.warn(`Failed to add member to meeting channel: ${err}`);
      }
    }

    const [updated] = await this.db
      .update(meetings)
      .set({ participants, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    return updated;
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

    const [updated] = await this.db
      .update(meetings)
      .set({ participants, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();
    return updated;
  }
}
