import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQLWrapper,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  projectAnnouncements,
  projectAnnouncementReactions,
  type ProjectAnnouncement,
} from '../database/schema/project-announcements.schema';
import { projectMembers } from '../database/schema/projects.schema';
import { users } from '../database/schema/users.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

export interface AnnouncementReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface AnnouncementItem extends ProjectAnnouncement {
  authorName: string | null;
  reactions: AnnouncementReactionSummary[];
  reactionCount: number;
}

@Injectable()
export class ProjectAnnouncementsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly access: ProjectAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateAnnouncementDto,
  ): Promise<AnnouncementItem> {
    await this.access.assertRole(projectId, userId, 'manager');

    const [announcement] = await this.db
      .insert(projectAnnouncements)
      .values({
        projectId,
        authorId: userId,
        title: dto.title,
        body: dto.body,
        isPinned: dto.isPinned ?? false,
      })
      .returning();

    const members = await this.db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const recipients = members
      .filter((m) => m.userId !== userId)
      .map((m) => ({
        userId: m.userId,
        type: 'project_announcement',
        title: 'New project announcement',
        description: dto.title,
        actionUrl: `/projects/${projectId}?tab=announcements`,
      }));
    if (recipients.length > 0) {
      await this.notificationsService.createMany(recipients);
    }

    return this.decorate(announcement, userId);
  }

  async findAll(
    projectId: string,
    userId: string,
    q?: string,
  ): Promise<AnnouncementItem[]> {
    await this.access.assertMember(projectId, userId);

    const conditions: SQLWrapper[] = [
      eq(projectAnnouncements.projectId, projectId),
    ];
    const term = q?.trim();
    const termClause = term
      ? or(
          ilike(projectAnnouncements.title, `%${term}%`),
          ilike(projectAnnouncements.body, `%${term}%`),
        )
      : undefined;
    if (termClause) conditions.push(termClause);

    const rows = await this.db
      .select()
      .from(projectAnnouncements)
      .where(and(...conditions))
      .orderBy(
        desc(projectAnnouncements.isPinned),
        desc(projectAnnouncements.createdAt),
      );

    return this.decorateMany(rows, userId);
  }

  async update(
    projectId: string,
    userId: string,
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementItem> {
    await this.access.assertRole(projectId, userId, 'manager');
    const announcement = await this.requireInProject(id, projectId);

    const [updated] = await this.db
      .update(projectAnnouncements)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        updatedAt: new Date(),
      })
      .where(eq(projectAnnouncements.id, announcement.id))
      .returning();

    return this.decorate(updated, userId);
  }

  async setPinned(
    projectId: string,
    userId: string,
    id: string,
    isPinned: boolean,
  ): Promise<AnnouncementItem> {
    await this.access.assertRole(projectId, userId, 'manager');
    const announcement = await this.requireInProject(id, projectId);

    const [updated] = await this.db
      .update(projectAnnouncements)
      .set({ isPinned, updatedAt: new Date() })
      .where(eq(projectAnnouncements.id, announcement.id))
      .returning();

    return this.decorate(updated, userId);
  }

  async remove(projectId: string, userId: string, id: string): Promise<void> {
    await this.access.assertRole(projectId, userId, 'manager');
    await this.requireInProject(id, projectId);
    await this.db
      .delete(projectAnnouncements)
      .where(eq(projectAnnouncements.id, id));
  }

  async addReaction(
    projectId: string,
    userId: string,
    id: string,
    emoji: string,
  ): Promise<AnnouncementItem> {
    await this.access.assertMember(projectId, userId);
    const announcement = await this.requireInProject(id, projectId);

    await this.db
      .insert(projectAnnouncementReactions)
      .values({ announcementId: announcement.id, userId, emoji })
      .onConflictDoNothing();

    return this.decorate(announcement, userId);
  }

  async removeReaction(
    projectId: string,
    userId: string,
    id: string,
    emoji: string,
  ): Promise<AnnouncementItem> {
    await this.access.assertMember(projectId, userId);
    const announcement = await this.requireInProject(id, projectId);

    await this.db
      .delete(projectAnnouncementReactions)
      .where(
        and(
          eq(projectAnnouncementReactions.announcementId, announcement.id),
          eq(projectAnnouncementReactions.userId, userId),
          eq(projectAnnouncementReactions.emoji, emoji),
        ),
      );

    return this.decorate(announcement, userId);
  }

  private async requireInProject(
    id: string,
    projectId: string,
  ): Promise<ProjectAnnouncement> {
    const [row] = await this.db
      .select()
      .from(projectAnnouncements)
      .where(
        and(
          eq(projectAnnouncements.id, id),
          eq(projectAnnouncements.projectId, projectId),
        ),
      );
    if (!row) throw new NotFoundException(`Announcement ${id} not found`);
    return row;
  }

  private async decorateMany(
    rows: ProjectAnnouncement[],
    currentUserId: string,
  ): Promise<AnnouncementItem[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const reactions = await this.db
      .select()
      .from(projectAnnouncementReactions)
      .where(inArray(projectAnnouncementReactions.announcementId, ids));

    const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
    const authors = authorIds.length
      ? await this.db
          .select()
          .from(users)
          .where(inArray(users.clerkId, authorIds))
      : [];
    const authorNames = new Map(
      authors.map((u) => [
        u.clerkId,
        [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      ]),
    );

    return rows.map((row) => {
      const rowReactions = reactions.filter((r) => r.announcementId === row.id);
      const grouped = new Map<
        string,
        { count: number; reactedByMe: boolean }
      >();
      for (const r of rowReactions) {
        const entry = grouped.get(r.emoji) ?? { count: 0, reactedByMe: false };
        entry.count += 1;
        if (r.userId === currentUserId) entry.reactedByMe = true;
        grouped.set(r.emoji, entry);
      }
      return {
        ...row,
        authorName: authorNames.get(row.authorId) ?? null,
        reactions: Array.from(grouped, ([emoji, value]) => ({
          emoji,
          count: value.count,
          reactedByMe: value.reactedByMe,
        })),
        reactionCount: rowReactions.length,
      };
    });
  }

  private async decorate(
    row: ProjectAnnouncement,
    currentUserId: string,
  ): Promise<AnnouncementItem> {
    const [decorated] = await this.decorateMany([row], currentUserId);
    return decorated;
  }
}
