import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { reminders, Reminder } from '../database/schema/message-actions.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReminderDto): Promise<Reminder> {
    const [reminder] = await this.db
      .insert(reminders)
      .values({
        userId,
        title: dto.title,
        scheduledFor: new Date(dto.scheduledFor),
        priority: (dto.priority as Reminder['priority']) ?? 'Medium',
        notes: dto.notes ?? null,
        sourceChannelId: dto.sourceChannelId ?? null,
        sourceMessageId: dto.sourceMessageId ?? null,
        sourceSenderId: dto.sourceSenderId ?? null,
        sourceChannelName: dto.sourceChannelName ?? null,
      })
      .returning();
    return reminder;
  }

  async findAll(userId: string, includeTriggered = false): Promise<Reminder[]> {
    const conditions = [eq(reminders.userId, userId)];
    if (!includeTriggered) conditions.push(eq(reminders.isTriggered, false));
    return this.db
      .select()
      .from(reminders)
      .where(and(...conditions))
      .orderBy(asc(reminders.scheduledFor));
  }

  async findOne(id: string, userId: string): Promise<Reminder> {
    const [reminder] = await this.db
      .select()
      .from(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
    if (!reminder) throw new NotFoundException(`Reminder ${id} not found`);
    return reminder;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReminderDto,
  ): Promise<Reminder> {
    await this.findOne(id, userId);
    const [updated] = await this.db
      .update(reminders)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.scheduledFor !== undefined && {
          scheduledFor: new Date(dto.scheduledFor),
        }),
        ...(dto.priority !== undefined && {
          priority: dto.priority as Reminder['priority'],
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
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  }

  async trigger(id: string, userId: string): Promise<Reminder> {
    const reminder = await this.findOne(id, userId);
    if (reminder.isTriggered) return reminder;

    const actionUrl =
      reminder.sourceChannelId && reminder.sourceMessageId
        ? `/dashboard?channel=${encodeURIComponent(
            reminder.sourceChannelId,
          )}&message=${encodeURIComponent(reminder.sourceMessageId)}`
        : '/reminders';

    await this.notificationsService.create({
      userId,
      type: 'reminder',
      title: `Reminder: ${reminder.title}`,
      description:
        reminder.notes ??
        `Scheduled for ${reminder.scheduledFor.toISOString()}`,
      actionUrl,
    });

    const [updated] = await this.db
      .update(reminders)
      .set({ isTriggered: true, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }
}
