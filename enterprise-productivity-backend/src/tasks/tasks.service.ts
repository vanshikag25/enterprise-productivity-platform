import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ChannelData } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import { tasks, Task } from '../database/schema/tasks.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    let streamChannelId: string | null = null;

    try {
      streamChannelId = await this.createTaskChannel(
        userId,
        dto.title,
        dto.assignee,
      );
    } catch (err) {
      this.logger.warn(`Failed to create Stream channel for task: ${err}`);
    }

    const [task] = await this.db
      .insert(tasks)
      .values({
        title: dto.title,
        description: dto.description ?? null,
        status: (dto.status as Task['status']) ?? 'Todo',
        priority: (dto.priority as Task['priority']) ?? 'Medium',
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

  private async linkSourceMessage(
    task: Task,
    dto: CreateTaskDto,
  ): Promise<void> {
    const client = this.streamService.getClient();
    const { sourceChannelId, sourceMessageId } = dto;
    if (!sourceChannelId || !sourceMessageId) return;

    try {
      const { message } = await client.getMessage(sourceMessageId);
      if (message.channel?.id && message.channel.id !== sourceChannelId) {
        this.logger.warn(
          `Message ${sourceMessageId} does not belong to channel ${sourceChannelId}; skipping link.`,
        );
        return;
      }

      await client.partialUpdateMessage(sourceMessageId, {
        set: {
          linked_task_id: task.id,
          linked_task_title: task.title,
        } as unknown as Parameters<
          typeof client.partialUpdateMessage
        >[1]['set'],
      });

      const channel = client.channel('messaging', sourceChannelId);
      await channel.sendMessage({
        text: `Task "${task.title}" was created from this conversation.`,
        user_id: task.createdBy,
      });
    } catch (err) {
      this.logger.warn(`Failed to link message ${sourceMessageId}: ${err}`);
    }
  }

  async findBySourceMessage(messageId: string): Promise<Task | null> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.sourceMessageId, messageId));
    return task ?? null;
  }

  async findAll(): Promise<Task[]> {
    return this.db.select().from(tasks);
  }

  async findOne(id: string): Promise<Task> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async getOrCreateChannel(
    id: string,
    userId: string,
  ): Promise<{ channelId: string }> {
    const task = await this.findOne(id);
    if (task.createdBy !== userId && task.assignee !== userId) {
      throw new ForbiddenException(
        'Only the task creator or assignee can open this discussion',
      );
    }

    if (task.streamChannelId) {
      try {
        const existing = await this.streamService
          .getClient()
          .queryChannels({ id: task.streamChannelId });
        if (existing.length > 0) {
          return { channelId: task.streamChannelId };
        }
      } catch (err) {
        this.logger.warn(
          `Failed to verify task channel ${task.streamChannelId}: ${err}`,
        );
      }
    }

    const channelId = await this.createTaskChannel(
      task.createdBy,
      task.title,
      task.assignee ?? undefined,
    );
    await this.db
      .update(tasks)
      .set({ streamChannelId: channelId, updatedAt: new Date() })
      .where(eq(tasks.id, id));

    return { channelId };
  }

  private async createTaskChannel(
    createdBy: string,
    title: string,
    assignee?: string,
  ): Promise<string> {
    const members = Array.from(
      new Set([createdBy, ...(assignee ? [assignee] : [])]),
    );
    const channelData = {
      name: `Task: ${title}`,
      members,
      created_by_id: createdBy,
      channel_kind: 'task',
    };
    const channel = this.streamService
      .getClient()
      .channel(
        'messaging',
        randomUUID(),
        channelData as unknown as ChannelData,
      );
    await channel.create();
    const channelId = channel.id ?? null;
    if (!channelId)
      throw new Error('Stream did not return a channel id after create.');
    return channelId;
  }

  async update(id: string, userId: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    if (task.createdBy !== userId)
      throw new ForbiddenException('Only the creator can edit this task');

    const [updated] = await this.db
      .update(tasks)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && {
          status: dto.status as Task['status'],
        }),
        ...(dto.priority !== undefined && {
          priority: dto.priority as Task['priority'],
        }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.assignee !== undefined && { assignee: dto.assignee }),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
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

  async updateStatus(
    id: string,
    userId: string,
    status: string,
  ): Promise<Task> {
    const task = await this.findOne(id);
    if (task.createdBy !== userId && task.assignee !== userId) {
      throw new ForbiddenException(
        'Only the creator or assignee can update status',
      );
    }

    const [updated] = await this.db
      .update(tasks)
      .set({ status: status as Task['status'], updatedAt: new Date() })
      .where(eq(tasks.id, id))
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
            } as unknown as Parameters<typeof channel.updatePartial>[0]['set'],
          });
        } catch (err) {
          this.logger.warn(`Failed to archive task channel: ${err}`);
        }
      }

      const participants = Array.from(
        new Set([
          updated.createdBy,
          ...(updated.assignee ? [updated.assignee] : []),
        ]),
      ).filter((participant) => participant !== userId);

      if (participants.length > 0) {
        await this.notificationsService.createMany(
          participants.map((participant) => ({
            userId: participant,
            type: 'task_updated',
            title: status === 'Closed' ? 'Task closed' : 'Task completed',
            description: updated.title,
            actionUrl: '/tasks',
          })),
        );
      }

      return updated;
    }

    const otherParty =
      userId === updated.createdBy ? updated.assignee : updated.createdBy;
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

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id);
    if (task.createdBy !== userId)
      throw new ForbiddenException('Only the creator can delete this task');
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }
}
