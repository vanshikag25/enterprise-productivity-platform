import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import type { ChannelData } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  projectMilestones,
  type ProjectMilestone,
} from '../database/schema/project-milestones.schema';
import { projectMembers } from '../database/schema/projects.schema';
import { users } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MILESTONE_STATUSES } from './dto/create-milestone.dto';

export interface MilestoneItem extends ProjectMilestone {
  ownerName: string | null;
}

@Injectable()
export class ProjectMilestonesService {
  private readonly logger = new Logger(ProjectMilestonesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly access: ProjectAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateMilestoneDto,
  ): Promise<MilestoneItem> {
    await this.access.assertRole(projectId, userId, 'manager');

    let streamChannelId: string | null = null;
    try {
      const members = await this.projectMemberIds(projectId);
      const channel = this.streamService
        .getClient()
        .channel(
          'messaging',
          randomUUID(),
          this.milestoneChannelData(projectId, userId, dto.title, members),
        );
      await channel.create();
      streamChannelId = channel.id ?? null;
    } catch (err) {
      this.logger.warn(`Failed to create milestone thread channel: ${err}`);
    }

    const [milestone] = await this.db
      .insert(projectMilestones)
      .values({
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        ownerId: dto.ownerId ?? null,
        status: (dto.status as ProjectMilestone['status']) ?? 'planned',
        progress: dto.progress ?? 0,
        streamChannelId,
      })
      .returning();

    await this.notifyMembers(
      projectId,
      userId,
      'New milestone added',
      milestone.title,
      'project_milestone',
    );

    return this.decorate(milestone);
  }

  async findAll(
    projectId: string,
    userId: string,
    status?: string,
    sortBy?: string,
  ): Promise<MilestoneItem[]> {
    await this.access.assertMember(projectId, userId);

    const conditions = [eq(projectMilestones.projectId, projectId)];
    if (
      status &&
      MILESTONE_STATUSES.includes(status as (typeof MILESTONE_STATUSES)[number])
    ) {
      conditions.push(
        eq(projectMilestones.status, status as ProjectMilestone['status']),
      );
    }

    const order = this.orderFor(sortBy);
    const rows = await this.db
      .select()
      .from(projectMilestones)
      .where(and(...conditions))
      .orderBy(...order);

    return this.decorateMany(rows);
  }

  private orderFor(sortBy?: string) {
    switch (sortBy) {
      case 'dueDate':
        return [
          asc(projectMilestones.dueDate),
          desc(projectMilestones.createdAt),
        ];
      case 'progress':
        return [
          desc(projectMilestones.progress),
          desc(projectMilestones.createdAt),
        ];
      case 'status':
        return [
          asc(projectMilestones.status),
          desc(projectMilestones.createdAt),
        ];
      default:
        return [desc(projectMilestones.createdAt)];
    }
  }

  async update(
    projectId: string,
    userId: string,
    id: string,
    dto: UpdateMilestoneDto,
  ): Promise<MilestoneItem> {
    await this.access.assertRole(projectId, userId, 'manager');
    await this.requireInProject(id, projectId);

    const [updated] = await this.db
      .update(projectMilestones)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
        ...(dto.status !== undefined && {
          status: dto.status as ProjectMilestone['status'],
        }),
        ...(dto.progress !== undefined && { progress: dto.progress }),
        updatedAt: new Date(),
      })
      .where(eq(projectMilestones.id, id))
      .returning();

    if (dto.title !== undefined && updated.streamChannelId) {
      try {
        const channel = this.streamService
          .getClient()
          .channel('messaging', updated.streamChannelId);
        await channel.updatePartial({
          set: {
            name: `Milestone: ${updated.title}`,
          } as unknown as Parameters<typeof channel.updatePartial>[0]['set'],
        });
      } catch (err) {
        this.logger.warn(`Failed to rename milestone thread: ${err}`);
      }
    }

    return this.decorate(updated);
  }

  async updateStatus(
    projectId: string,
    userId: string,
    id: string,
    status: string,
  ): Promise<MilestoneItem> {
    await this.access.assertRole(projectId, userId, 'manager');
    const milestone = await this.requireInProject(id, projectId);

    const [updated] = await this.db
      .update(projectMilestones)
      .set({
        status: status as ProjectMilestone['status'],
        progress:
          status === 'completed'
            ? 100
            : milestone.progress > 0
              ? milestone.progress
              : 0,
        updatedAt: new Date(),
      })
      .where(eq(projectMilestones.id, id))
      .returning();

    await this.notifyMembers(
      projectId,
      userId,
      'Milestone status changed',
      `${updated.title} — ${status}`,
      'project_milestone',
    );

    return this.decorate(updated);
  }

  async updateProgress(
    projectId: string,
    userId: string,
    id: string,
    progress: number,
  ): Promise<MilestoneItem> {
    await this.access.assertRole(projectId, userId, 'manager');
    const milestone = await this.requireInProject(id, projectId);

    const [updated] = await this.db
      .update(projectMilestones)
      .set({
        progress,
        status:
          progress >= 100
            ? 'completed'
            : progress > 0 && milestone.status === 'planned'
              ? 'in_progress'
              : milestone.status,
        updatedAt: new Date(),
      })
      .where(eq(projectMilestones.id, id))
      .returning();

    return this.decorate(updated);
  }

  async remove(projectId: string, userId: string, id: string): Promise<void> {
    await this.access.assertRole(projectId, userId, 'manager');
    const milestone = await this.requireInProject(id, projectId);

    if (milestone.streamChannelId) {
      try {
        await this.streamService
          .getClient()
          .channel('messaging', milestone.streamChannelId)
          .delete();
      } catch (err) {
        this.logger.warn(`Failed to delete milestone thread: ${err}`);
      }
    }

    await this.db.delete(projectMilestones).where(eq(projectMilestones.id, id));
  }

  private milestoneChannelData(
    projectId: string,
    createdBy: string,
    title: string,
    members: string[],
  ): ChannelData {
    return {
      name: `Milestone: ${title}`,
      description: `Discussion thread for milestone "${title}"`,
      channel_kind: 'milestone',
      project_id: projectId,
      members,
      created_by_id: createdBy,
    } as unknown as ChannelData;
  }

  private async projectMemberIds(projectId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    return rows.map((r) => r.userId);
  }

  private async notifyMembers(
    projectId: string,
    actorId: string,
    title: string,
    description: string,
    type: string,
  ): Promise<void> {
    const memberIds = await this.projectMemberIds(projectId);
    const recipients = memberIds
      .filter((m) => m !== actorId)
      .map((m) => ({
        userId: m,
        type,
        title,
        description,
        actionUrl: `/projects/${projectId}?tab=milestones`,
      }));
    if (recipients.length > 0) {
      await this.notificationsService.createMany(recipients);
    }
  }

  private async requireInProject(
    id: string,
    projectId: string,
  ): Promise<ProjectMilestone> {
    const [row] = await this.db
      .select()
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.id, id),
          eq(projectMilestones.projectId, projectId),
        ),
      );
    if (!row) throw new NotFoundException(`Milestone ${id} not found`);
    return row;
  }

  private async decorateMany(
    rows: ProjectMilestone[],
  ): Promise<MilestoneItem[]> {
    if (rows.length === 0) return [];

    const ownerIds = Array.from(
      new Set(rows.map((r) => r.ownerId).filter(Boolean) as string[]),
    );
    const owners = ownerIds.length
      ? await this.db
          .select()
          .from(users)
          .where(inArray(users.username, ownerIds))
      : [];
    const nameByUser = new Map(
      owners.map((u) => [
        u.username,
        [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      ]),
    );

    return rows.map((row) => ({
      ...row,
      ownerName: row.ownerId ? (nameByUser.get(row.ownerId) ?? null) : null,
    }));
  }

  private async decorate(row: ProjectMilestone): Promise<MilestoneItem> {
    const [decorated] = await this.decorateMany([row]);
    return decorated;
  }
}
