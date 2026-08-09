import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import type { ChannelData } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  projects,
  projectMembers,
  type Project,
  type ProjectMemberRole,
} from '../database/schema/projects.schema';
import { projectMilestones } from '../database/schema/project-milestones.schema';
import { users } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { hasMinRole } from '../rbac/roles';
import { ProjectAccessService } from './project-access.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export interface ProjectMemberSummary {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: ProjectMemberRole;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  channelId: string | null;
  memberCount: number;
  currentUserRole: ProjectMemberRole | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly usersService: UsersService,
    private readonly access: ProjectAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectSummary> {
    const user = await this.usersService.findByUsername(userId);
    if (!user || !hasMinRole(user.role, 'manager')) {
      throw new ForbiddenException(
        'Only Managers and above can create projects',
      );
    }

    const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));

    const [project] = await this.db
      .insert(projects)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        ownerId: userId,
      })
      .returning();

    await this.db
      .insert(projectMembers)
      .values(
        memberIds.map((memberId) => ({
          projectId: project.id,
          userId: memberId,
          role: memberId === userId ? ('owner' as const) : ('member' as const),
        })),
      )
      .onConflictDoNothing();

    try {
      const channel = this.streamService
        .getClient()
        .channel(
          'messaging',
          randomUUID(),
          this.projectChannelData(project, memberIds),
        );
      await channel.create();
      await this.db
        .update(projects)
        .set({ channelId: channel.id ?? null })
        .where(eq(projects.id, project.id));
    } catch (err) {
      this.logger.warn(`Failed to create Stream channel for project: ${err}`);
    }

    const added = memberIds.filter((m) => m !== userId);
    if (added.length > 0) {
      await this.notificationsService.createMany(
        added.map((m) => ({
          userId: m,
          type: 'added_to_project',
          title: 'Added to project',
          description: project.name,
          actionUrl: `/projects/${project.id}`,
        })),
      );
    }

    return this.summary(project, memberIds.length, 'owner');
  }

  private projectChannelData(
    project: Project,
    memberIds: string[],
  ): ChannelData {
    return {
      name: project.name,
      description: project.description ?? undefined,
      image: project.avatarUrl ?? undefined,
      channel_kind: 'project',
      project_id: project.id,
      members: memberIds,
      created_by_id: project.ownerId,
    } as unknown as ChannelData;
  }

  async findAll(userId: string): Promise<ProjectSummary[]> {
    const user = await this.usersService.findByUsername(userId);
    const isOrgAdmin = Boolean(user && hasMinRole(user.role, 'admin'));

    const rows = await this.db
      .select({ project: projects, memberCount: count(projectMembers.userId) })
      .from(projects)
      .leftJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(isOrgAdmin ? undefined : eq(projectMembers.userId, userId))
      .groupBy(projects.id)
      .orderBy(desc(projects.createdAt));

    const projectIds = rows.map((r) => r.project.id);
    const memberships = projectIds.length
      ? await this.db
          .select()
          .from(projectMembers)
          .where(
            and(
              inArray(projectMembers.projectId, projectIds),
              eq(projectMembers.userId, userId),
            ),
          )
      : [];

    const roleByProject = new Map(
      memberships.map((m) => [m.projectId, m.role]),
    );

    return rows.map((r) =>
      this.summary(
        r.project,
        r.memberCount,
        roleByProject.get(r.project.id) ?? null,
      ),
    );
  }

  async findOne(id: string, userId: string): Promise<ProjectSummary> {
    await this.access.assertMember(id, userId);
    const project = await this.requireProject(id);

    const [memberCountRow] = await this.db
      .select({ n: count(projectMembers.userId) })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, id));

    const role = await this.access.memberRole(id, userId);
    return this.summary(project, memberCountRow?.n ?? 0, role);
  }

  async requireProject(id: string): Promise<Project> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  private summary(
    project: Project,
    memberCount: number,
    currentUserRole: ProjectMemberRole | null,
  ): ProjectSummary {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      avatarUrl: project.avatarUrl,
      ownerId: project.ownerId,
      channelId: project.channelId,
      memberCount,
      currentUserRole,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectSummary> {
    await this.access.assertRole(id, userId, 'manager');
    const [project] = await this.db
      .update(projects)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    await this.pushChannelDetails(project);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.access.assertRole(id, userId, 'owner');
    const project = await this.requireProject(id);

    if (project.channelId) {
      try {
        await this.streamService
          .getClient()
          .channel('messaging', project.channelId)
          .delete();
      } catch (err) {
        this.logger.warn(`Failed to delete project channel: ${err}`);
      }
    }

    const milestoneChannels = await this.db
      .select({ streamChannelId: projectMilestones.streamChannelId })
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, id));
    await Promise.all(
      milestoneChannels.map(async (m) => {
        if (!m.streamChannelId) return;
        try {
          await this.streamService
            .getClient()
            .channel('messaging', m.streamChannelId)
            .delete();
        } catch (err) {
          this.logger.warn(`Failed to delete milestone channel: ${err}`);
        }
      }),
    );

    await this.db.delete(projects).where(eq(projects.id, id));
  }

  async listMembers(
    id: string,
    userId: string,
  ): Promise<ProjectMemberSummary[]> {
    await this.access.assertMember(id, userId);
    const rows = await this.db
      .select({
        id: projectMembers.userId,
        role: projectMembers.role,
        name: users.firstName,
        email: users.email,
        imageUrl: users.imageUrl,
      })
      .from(projectMembers)
      .leftJoin(users, eq(users.username, projectMembers.userId))
      .where(eq(projectMembers.projectId, id))
      .orderBy(projectMembers.joinedAt);

    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      name: r.name ?? null,
      email: r.email ?? null,
      imageUrl: r.imageUrl ?? null,
    }));
  }

  async addMember(
    id: string,
    userId: string,
    memberId: string,
    role: ProjectMemberRole = 'member',
  ): Promise<ProjectMemberSummary[]> {
    await this.access.assertRole(id, userId, 'manager');
    if (memberId === userId && role !== 'owner') {
      throw new BadRequestException('You cannot add yourself with that role');
    }

    const target = await this.usersService.findByUsername(memberId);
    if (!target) {
      throw new BadRequestException('User not found in the organization');
    }

    await this.db
      .insert(projectMembers)
      .values({ projectId: id, userId: memberId, role })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { role, joinedAt: new Date() },
      });

    await this.pushChannelMemberIds(id, [memberId], []);

    const project = await this.requireProject(id);
    await this.notificationsService.create({
      userId: memberId,
      type: 'added_to_project',
      title: 'Added to project',
      description: project.name,
      actionUrl: `/projects/${project.id}`,
    });

    return this.listMembers(id, userId);
  }

  async removeMember(
    id: string,
    userId: string,
    memberId: string,
  ): Promise<ProjectMemberSummary[]> {
    await this.access.assertRole(id, userId, 'manager');
    if (memberId === userId) {
      throw new BadRequestException(
        'Owners and managers must not remove themselves',
      );
    }

    const role = await this.access.memberRole(id, memberId);
    if (role === 'owner') {
      throw new ForbiddenException('The project owner cannot be removed');
    }

    await this.db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, memberId),
        ),
      );

    await this.pushChannelMemberIds(id, [], [memberId]);
    return this.listMembers(id, userId);
  }

  async updateMemberRole(
    id: string,
    userId: string,
    memberId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMemberSummary[]> {
    await this.access.assertRole(id, userId, 'manager');
    if (memberId === userId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const current = await this.access.memberRole(id, memberId);
    if (current === 'owner') {
      throw new ForbiddenException('The project owner role cannot be changed');
    }
    if (role === 'owner') {
      throw new ForbiddenException(
        'Use ownership transfer to assign the owner role',
      );
    }

    await this.db
      .update(projectMembers)
      .set({ role })
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, memberId),
        ),
      );

    return this.listMembers(id, userId);
  }

  /**
   * Single source of truth for pushing project details (name/description/
   * avatar) to the linked Stream channel.
   */
  private async pushChannelDetails(project: Project): Promise<void> {
    if (!project.channelId) {
      this.logger.warn(
        `Project ${project.id} has no linked channel; skipping sync`,
      );
      return;
    }
    const channel = this.streamService
      .getClient()
      .channel('messaging', project.channelId);
    await channel.updatePartial({
      set: {
        name: project.name,
        description: project.description ?? '',
        ...(project.avatarUrl ? { image: project.avatarUrl } : {}),
      } as unknown as Parameters<typeof channel.updatePartial>[0]['set'],
    });
  }

  /**
   * Single source of truth for pushing membership changes to the linked
   * Stream channel.
   */
  private async pushChannelMemberIds(
    projectId: string,
    added: string[],
    removed: string[],
  ): Promise<void> {
    const project = await this.requireProject(projectId);
    if (!project.channelId) return;
    const channel = this.streamService
      .getClient()
      .channel('messaging', project.channelId);
    if (added.length > 0) await channel.addMembers(added);
    if (removed.length > 0) await channel.removeMembers(removed);
  }

  async memberRoleFor(
    id: string,
    userId: string,
  ): Promise<ProjectMemberRole | null> {
    await this.access.assertMember(id, userId);
    return this.access.memberRole(id, userId);
  }

  /** Convenience used by sibling modules to honor project-level permissions. */
  getAccess(): ProjectAccessService {
    return this.access;
  }
}
