import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { and, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  moderationActions,
  moderationReports,
  type ModerationActionType,
  type ModerationReportStatus,
} from '../database/schema/moderation.schema';
import { projects, projectMembers } from '../database/schema/projects.schema';
import { departments } from '../database/schema/departments.schema';
import { users, type User } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import { UsersService } from '../users/users.service';
import {
  ProjectAccessService,
  hasProjectRole,
} from '../projects/project-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ROLE_RANK, type UserRole } from '../rbac/roles';
import type { Channel as StreamChannel, MessageResponse } from 'stream-chat';

export type ModerationScope = 'platform' | 'managed' | 'none';

export interface ListReportsParams {
  page: number;
  limit: number;
  status?: ModerationReportStatus;
}

export interface ListLogsParams {
  page: number;
  limit: number;
  actionType?: string;
}

function fullName(
  user: { firstName?: string | null; lastName?: string | null } | undefined,
): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';
}

@Injectable()
export class ModerationService implements OnModuleInit {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly usersService: UsersService,
    private readonly projectAccess: ProjectAccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureChannelModeratorsCanUseFrozenChannels();
  }

  /**
   * Locked channels are read-only: without the `use-frozen-channel` capability
   * even a channel moderator could not post. Grant it so moderators (who can
   * lock a channel) stay able to participate.
   */
  private async ensureChannelModeratorsCanUseFrozenChannels(): Promise<void> {
    try {
      const client = this.streamService.getClient();
      const { grants } = await client.getChannelType('messaging');
      const grantsCopy = { ...(grants ?? {}) };
      let changed = false;
      for (const role of ['channel_moderator', 'moderator'] as const) {
        const current = grantsCopy[role] ?? [];
        if (!current.includes('use-frozen-channel')) {
          grantsCopy[role] = [...current, 'use-frozen-channel'];
          changed = true;
        }
      }
      if (changed) {
        await client.updateChannelType('messaging', { grants: grantsCopy });
        this.logger.log(
          'Granted channel moderators use-frozen-channel permission.',
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to configure frozen-channel permission for moderators: ${err}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Permission helpers
  // ---------------------------------------------------------------------------

  private platformRole(role: UserRole): boolean {
    return (
      role === 'super_admin' ||
      role === 'organization_owner' ||
      role === 'admin'
    );
  }

  private async watchChannel(channelId: string): Promise<StreamChannel> {
    try {
      const channel = this.streamService
        .getClient()
        .channel('messaging', channelId);
      await channel.watch();
      return channel;
    } catch {
      throw new BadRequestException('Channel not found.');
    }
  }

  private memberIsModerator(member: {
    is_moderator?: boolean;
    channel_role?: string;
  }): boolean {
    return Boolean(
      member?.is_moderator ||
      member?.channel_role === 'channel_moderator' ||
      member?.channel_role === 'moderator',
    );
  }

  /**
   * The Stream moderation API surface used for mute/unmute. Typed locally to
   * keep the generated Moderation class from tripping strict lint rules.
   */
  private moderationApi() {
    return this.streamService.getClient().moderation as unknown as {
      muteUser: (
        targetID: string,
        options?: { timeout?: number; user_id?: string },
      ) => Promise<unknown>;
      unmuteUser: (
        targetID: string,
        options?: { user_id?: string },
      ) => Promise<unknown>;
    };
  }

  /**
   * Whether `actor` may moderate `channel`. Super Admins/Admins are platform
   * wide. Managers moderate channels they created, channels they moderate,
   * project channels they are assigned as owner/manager, and department
   * channels they created. Team Leads moderate only channels they created or
   * moderate.
   */
  async channelScope(
    channel: StreamChannel,
    actor: User,
  ): Promise<ModerationScope> {
    if (this.platformRole(actor.role)) return 'platform';

    if (actor.role !== 'manager' && actor.role !== 'team_lead') {
      return 'none';
    }

    const data = (channel.data ?? {}) as Record<string, unknown>;
    const createdById = data.created_by_id as string | undefined;
    if (createdById === actor.username) return 'managed';

    const member = (channel.state?.members ?? {})[actor.username] as
      { is_moderator?: boolean; channel_role?: string } | undefined;
    if (member && this.memberIsModerator(member)) return 'managed';

    if (actor.role === 'manager') {
      const projectId = data.project_id as string | undefined;
      if (projectId) {
        const projectRole = await this.projectAccess.memberRole(
          projectId,
          actor.username,
        );
        if (projectRole && hasProjectRole(projectRole, 'manager')) {
          return 'managed';
        }
      }

      const departmentId = data.department_id as string | undefined;
      if (departmentId) {
        const [dept] = await this.db
          .select()
          .from(departments)
          .where(eq(departments.id, departmentId));
        if (dept && dept.createdBy === actor.username) return 'managed';
      }
    }

    return 'none';
  }

  private async assertCanModerateChannel(
    channel: StreamChannel,
    actor: User,
  ): Promise<ModerationScope> {
    const scope = await this.channelScope(channel, actor);
    if (scope === 'none') {
      throw new ForbiddenException(
        'You do not have permission to moderate this channel.',
      );
    }
    return scope;
  }

  private async requireTargetUser(targetUserId: string): Promise<User> {
    const target = await this.usersService.findByUsername(targetUserId);
    if (!target) throw new BadRequestException('User not found.');
    return target;
  }

  private assertNotSelf(actor: User, targetUserId: string): void {
    if (actor.username === targetUserId) {
      throw new BadRequestException(
        'You cannot perform a moderation action on your own account.',
      );
    }
  }

  private assertTargetRankBelow(actor: User, target: User): void {
    if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) {
      throw new ForbiddenException(
        'You cannot moderate a user with an equal or higher role.',
      );
    }
  }

  private assertCanBan(actor: User): void {
    if (!this.platformRole(actor.role)) {
      throw new ForbiddenException(
        'Only Super Admins and Admins can ban users.',
      );
    }
  }

  private async log(
    actor: User,
    actionType: ModerationActionType,
    fields: {
      targetUserId?: string;
      targetMessageId?: string;
      channelId?: string;
      reason?: string;
    },
  ): Promise<void> {
    await this.db.insert(moderationActions).values({
      moderatorId: actor.username,
      moderatorRole: actor.role,
      actionType,
      targetUserId: fields.targetUserId ?? null,
      targetMessageId: fields.targetMessageId ?? null,
      channelId: fields.channelId ?? null,
      reason: fields.reason ?? null,
    });
  }

  /**
   * Channel ids this manager/team-lead may moderate, for scoping report and
   * log queries.
   */
  private async managedChannelIds(actor: User): Promise<string[]> {
    const ids = new Set<string>();

    if (actor.role === 'manager') {
      const projectRows = await this.db
        .select({ channelId: projects.channelId })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(
          and(
            eq(projectMembers.userId, actor.username),
            sql`${projectMembers.role} in ('owner', 'manager')`,
          ),
        );
      for (const row of projectRows) if (row.channelId) ids.add(row.channelId);

      const deptRows = await this.db
        .select({ channelId: departments.channelId })
        .from(departments)
        .where(eq(departments.createdBy, actor.username));
      for (const row of deptRows) if (row.channelId) ids.add(row.channelId);
    }

    const client = this.streamService.getClient();
    const channels = await client.queryChannels(
      { type: 'messaging', members: { $in: [actor.username] } },
      {},
      { limit: 100 },
    );
    for (const ch of channels) {
      const data = (ch.data ?? {}) as Record<string, unknown>;
      if (data.created_by_id === actor.username) {
        if (ch.id) ids.add(ch.id);
        continue;
      }
      const member = (ch.state?.members ?? {})[actor.username] as
        { is_moderator?: boolean; channel_role?: string } | undefined;
      if (member && this.memberIsModerator(member) && ch.id) ids.add(ch.id);
    }

    return Array.from(ids);
  }

  // ---------------------------------------------------------------------------
  // Message moderation
  // ---------------------------------------------------------------------------

  async deleteMessage(
    actor: User,
    messageId: string,
    reason?: string,
  ): Promise<{ id: string; deleted: boolean }> {
    const client = this.streamService.getClient();
    let message: MessageResponse;
    try {
      const result = await client.getMessage(messageId);
      message = result.message;
    } catch {
      throw new BadRequestException('Message not found.');
    }

    const channelId = message.cid?.split(':')[1];
    if (!channelId) {
      throw new BadRequestException('Message has no channel context.');
    }

    const channel = await this.watchChannel(channelId);
    await this.assertCanModerateChannel(channel, actor);

    await client.deleteMessage(messageId, { hardDelete: false });
    await this.log(actor, 'message_delete', {
      targetMessageId: messageId,
      channelId,
      reason,
    });

    return { id: messageId, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // User moderation
  // ---------------------------------------------------------------------------

  async muteUser(
    actor: User,
    dto: {
      channelId: string;
      targetUserId: string;
      durationMinutes?: number;
      reason?: string;
    },
  ): Promise<{ muted: boolean; targetUserId: string; channelId: string }> {
    const channel = await this.watchChannel(dto.channelId);
    await this.assertCanModerateChannel(channel, actor);

    this.assertNotSelf(actor, dto.targetUserId);
    const target = await this.requireTargetUser(dto.targetUserId);
    this.assertTargetRankBelow(actor, target);

    if (actor.role === 'team_lead' && !dto.durationMinutes) {
      throw new BadRequestException('Team leads must specify a mute duration.');
    }

    const timeout = dto.durationMinutes
      ? Math.max(1, Math.round(dto.durationMinutes))
      : undefined;

    await this.moderationApi().muteUser(dto.targetUserId, {
      user_id: actor.username,
      timeout,
    });

    await this.log(actor, 'user_mute', {
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
      reason: dto.reason,
    });

    return {
      muted: true,
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
    };
  }

  async unmuteUser(
    actor: User,
    dto: { channelId: string; targetUserId: string; reason?: string },
  ): Promise<{ muted: boolean; targetUserId: string; channelId: string }> {
    const channel = await this.watchChannel(dto.channelId);
    await this.assertCanModerateChannel(channel, actor);
    this.assertNotSelf(actor, dto.targetUserId);
    await this.requireTargetUser(dto.targetUserId);

    await this.moderationApi().unmuteUser(dto.targetUserId, {
      user_id: actor.username,
    });

    await this.log(actor, 'user_unmute', {
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
      reason: dto.reason,
    });

    return {
      muted: false,
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
    };
  }

  async removeMember(
    actor: User,
    dto: { channelId: string; targetUserId: string; reason?: string },
  ): Promise<{ removed: boolean; targetUserId: string }> {
    if (actor.role === 'team_lead') {
      throw new ForbiddenException(
        'Team leads cannot remove members from a channel.',
      );
    }

    const channel = await this.watchChannel(dto.channelId);
    const scope = await this.assertCanModerateChannel(channel, actor);

    this.assertNotSelf(actor, dto.targetUserId);
    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (data.created_by_id === dto.targetUserId) {
      throw new BadRequestException('The channel creator cannot be removed.');
    }

    const targetMember = (channel.state?.members ?? {})[dto.targetUserId] as
      | {
          user?: { name?: string };
          is_moderator?: boolean;
          channel_role?: string;
        }
      | undefined;
    if (!targetMember) {
      throw new BadRequestException('User is not a member of this channel.');
    }

    if (
      this.memberIsModerator(targetMember) &&
      data.created_by_id !== actor.username &&
      scope !== 'platform'
    ) {
      throw new ForbiddenException(
        'Only the channel creator or a platform admin can remove a moderator.',
      );
    }

    await channel.removeMembers([dto.targetUserId]);

    await this.notificationsService.create({
      userId: dto.targetUserId,
      type: 'removed_from_group',
      title: 'Removed from channel',
      description: (data.name as string) ?? 'a channel',
    });

    await this.log(actor, 'member_remove', {
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
      reason: dto.reason,
    });

    return { removed: true, targetUserId: dto.targetUserId };
  }

  async banUser(
    actor: User,
    dto: {
      targetUserId: string;
      channelId?: string;
      timeoutMinutes?: number;
      reason?: string;
    },
  ): Promise<{ banned: boolean; targetUserId: string }> {
    this.assertCanBan(actor);
    this.assertNotSelf(actor, dto.targetUserId);
    const target = await this.requireTargetUser(dto.targetUserId);
    this.assertTargetRankBelow(actor, target);

    const client = this.streamService.getClient();
    const options = {
      reason: dto.reason,
      timeout: dto.timeoutMinutes
        ? Math.max(1, Math.round(dto.timeoutMinutes))
        : undefined,
      ban_from_future_channels: false,
    };

    if (dto.channelId) {
      const channel = await this.watchChannel(dto.channelId);
      await channel.banUser(dto.targetUserId, options);
    } else {
      await client.banUser(dto.targetUserId, options);
    }

    await this.log(actor, 'user_ban', {
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
      reason: dto.reason,
    });

    return { banned: true, targetUserId: dto.targetUserId };
  }

  async unbanUser(
    actor: User,
    dto: { targetUserId: string; channelId?: string; reason?: string },
  ): Promise<{ banned: boolean; targetUserId: string }> {
    this.assertCanBan(actor);
    this.assertNotSelf(actor, dto.targetUserId);
    await this.requireTargetUser(dto.targetUserId);

    const client = this.streamService.getClient();
    if (dto.channelId) {
      const channel = await this.watchChannel(dto.channelId);
      await channel.unbanUser(dto.targetUserId);
    } else {
      await client.unbanUser(dto.targetUserId);
    }

    await this.log(actor, 'user_unban', {
      targetUserId: dto.targetUserId,
      channelId: dto.channelId,
      reason: dto.reason,
    });

    return { banned: false, targetUserId: dto.targetUserId };
  }

  // ---------------------------------------------------------------------------
  // Channel moderation
  // ---------------------------------------------------------------------------

  async setChannelLock(
    actor: User,
    dto: { channelId: string; locked: boolean; reason?: string },
  ): Promise<{ channelId: string; locked: boolean }> {
    const channel = await this.watchChannel(dto.channelId);
    const scope = await this.assertCanModerateChannel(channel, actor);

    const data = (channel.data ?? {}) as Record<string, unknown>;
    if (Boolean(data.frozen) === dto.locked) {
      throw new BadRequestException(
        dto.locked
          ? 'This channel is already locked.'
          : 'This channel is not locked.',
      );
    }

    // Keep the locking moderator able to post in the now-read-only channel.
    if (dto.locked && scope === 'managed') {
      const member = (channel.state?.members ?? {})[actor.username] as
        { is_moderator?: boolean; channel_role?: string } | undefined;
      const isOwner = data.created_by_id === actor.username;
      if (!isOwner && !(member && this.memberIsModerator(member))) {
        try {
          await channel.addModerators([actor.username]);
        } catch (err) {
          this.logger.warn(
            `Failed to keep moderator ${actor.username} active in locked channel: ${err}`,
          );
        }
      }
    }

    await channel.updatePartial({
      set: {
        frozen: dto.locked,
        locked: dto.locked,
        locked_by: dto.locked ? actor.username : null,
        locked_at: dto.locked ? new Date().toISOString() : null,
        locked_reason: dto.locked ? (dto.reason ?? '') : '',
      } as Record<string, unknown>,
    });

    await this.log(actor, dto.locked ? 'channel_lock' : 'channel_unlock', {
      channelId: dto.channelId,
      reason: dto.reason,
    });

    return { channelId: dto.channelId, locked: dto.locked };
  }

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  async createReport(
    actor: User,
    dto: {
      targetType: 'message' | 'user';
      targetMessageId?: string;
      targetUserId?: string;
      channelId: string;
      channelName?: string;
      reason: string;
      description?: string;
    },
  ) {
    let targetUserId = dto.targetUserId;
    let targetUserName: string | null = null;
    let targetMessageText: string | null = null;
    let channelId = dto.channelId;
    const channelName = dto.channelName ?? null;

    const client = this.streamService.getClient();

    if (dto.targetType === 'message') {
      if (!dto.targetMessageId) {
        throw new BadRequestException('A target message is required.');
      }
      let message: MessageResponse;
      try {
        const result = await client.getMessage(dto.targetMessageId);
        message = result.message;
      } catch {
        throw new BadRequestException('Message not found.');
      }
      targetUserId = message.user?.id;
      targetUserName = message.user?.name ?? null;
      targetMessageText = message.text ?? null;
      channelId = channelId || message.cid?.split(':')[1] || '';
    } else {
      if (!targetUserId) {
        throw new BadRequestException('A target user is required.');
      }
      const target = await this.usersService.findByUsername(targetUserId);
      if (target) {
        targetUserName = fullName(target) || targetUserId;
      }
    }

    if (!channelId) {
      throw new BadRequestException('A channel is required.');
    }

    try {
      const [report] = await this.db
        .insert(moderationReports)
        .values({
          reporterId: actor.username,
          targetType: dto.targetType,
          targetMessageId: dto.targetMessageId ?? null,
          targetUserId: targetUserId ?? null,
          targetUserName,
          targetMessageText,
          channelId,
          channelName,
          reason: dto.reason,
          description: dto.description ?? null,
        })
        .returning();
      return this.serializeReport(report, fullName(actor));
    } catch (err) {
      const rawCode =
        (err as { code?: string })?.code ??
        (err as { cause?: { code?: string } })?.cause?.code;
      if (rawCode === '23505') {
        throw new ConflictException('You have already reported this content.');
      }
      throw err;
    }
  }

  private serializeReport(
    report: {
      id: string;
      reporterId: string;
      targetType: string;
      targetMessageId: string | null;
      targetUserId: string | null;
      targetUserName: string | null;
      targetMessageText: string | null;
      channelId: string;
      channelName: string | null;
      reason: string;
      description: string | null;
      status: string;
      reviewedBy: string | null;
      reviewedAt: Date | null;
      resolutionNote: string | null;
      createdAt: Date;
    },
    reporterName: string,
  ) {
    return {
      id: report.id,
      reporterId: report.reporterId,
      reporterName: reporterName || report.reporterId,
      targetType: report.targetType,
      targetMessageId: report.targetMessageId,
      targetUserId: report.targetUserId,
      targetUserName: report.targetUserName,
      targetMessageText: report.targetMessageText,
      channelId: report.channelId,
      channelName: report.channelName,
      reason: report.reason,
      description: report.description,
      status: report.status,
      reviewedBy: report.reviewedBy,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async listReports(actor: User, params: ListReportsParams) {
    const platform = this.platformRole(actor.role);
    if (!platform && actor.role !== 'manager' && actor.role !== 'team_lead') {
      throw new ForbiddenException(
        'You do not have permission to view reports.',
      );
    }

    const conditions: SQL[] = [];
    if (params.status) {
      conditions.push(eq(moderationReports.status, params.status));
    }
    if (!platform) {
      const managed = await this.managedChannelIds(actor);
      conditions.push(inArray(moderationReports.channelId, managed));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          report: moderationReports,
          reporterFirstName: users.firstName,
          reporterLastName: users.lastName,
        })
        .from(moderationReports)
        .leftJoin(users, eq(users.username, moderationReports.reporterId))
        .where(where)
        .orderBy(desc(moderationReports.createdAt))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(moderationReports)
        .where(where),
    ]);

    const items = rows.map((row) =>
      this.serializeReport(
        row.report,
        fullName(
          row.reporterFirstName
            ? {
                firstName: row.reporterFirstName,
                lastName: row.reporterLastName,
              }
            : undefined,
        ),
      ),
    );

    return {
      items,
      total: countRows[0]?.count ?? 0,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(
        1,
        Math.ceil((countRows[0]?.count ?? 0) / params.limit),
      ),
    };
  }

  async updateReport(
    actor: User,
    reportId: string,
    action: 'review' | 'resolve' | 'dismiss',
    note?: string,
  ) {
    const [report] = await this.db
      .select()
      .from(moderationReports)
      .where(eq(moderationReports.id, reportId));

    if (!report) throw new BadRequestException('Report not found.');

    const platform = this.platformRole(actor.role);
    if (!platform) {
      const managed = await this.managedChannelIds(actor);
      if (!managed.includes(report.channelId)) {
        throw new ForbiddenException(
          'You do not have permission to act on this report.',
        );
      }
    }

    const status =
      action === 'review'
        ? 'reviewing'
        : action === 'resolve'
          ? 'resolved'
          : 'dismissed';

    const [updated] = await this.db
      .update(moderationReports)
      .set({
        status,
        reviewedBy: actor.username,
        reviewedAt: new Date(),
        resolutionNote: note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(moderationReports.id, reportId))
      .returning();

    const actionType: ModerationActionType =
      action === 'review'
        ? 'report_review'
        : action === 'resolve'
          ? 'report_resolve'
          : 'report_dismiss';

    await this.log(actor, actionType, {
      targetMessageId: report.targetMessageId ?? undefined,
      targetUserId: report.targetUserId ?? undefined,
      channelId: report.channelId,
      reason: note ?? report.reason,
    });

    return this.serializeReport(updated, actor.username);
  }

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------

  async listLogs(actor: User, params: ListLogsParams) {
    const platform = this.platformRole(actor.role);
    if (!platform && actor.role !== 'manager' && actor.role !== 'team_lead') {
      throw new ForbiddenException(
        'You do not have permission to view moderation logs.',
      );
    }

    const conditions: SQL[] = [];
    if (params.actionType) {
      conditions.push(
        eq(
          moderationActions.actionType,
          params.actionType as ModerationActionType,
        ),
      );
    }
    if (!platform) {
      const managed = await this.managedChannelIds(actor);
      conditions.push(
        or(
          inArray(moderationActions.channelId, managed),
          eq(moderationActions.moderatorId, actor.username),
        ) as SQL,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          log: moderationActions,
          moderatorFirstName: users.firstName,
          moderatorLastName: users.lastName,
        })
        .from(moderationActions)
        .leftJoin(users, eq(users.username, moderationActions.moderatorId))
        .where(where)
        .orderBy(desc(moderationActions.createdAt))
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(moderationActions)
        .where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.log.id,
        moderatorId: row.log.moderatorId,
        moderatorName:
          fullName(
            row.moderatorFirstName
              ? {
                  firstName: row.moderatorFirstName,
                  lastName: row.moderatorLastName,
                }
              : undefined,
          ) || row.log.moderatorId,
        moderatorRole: row.log.moderatorRole,
        actionType: row.log.actionType,
        targetUserId: row.log.targetUserId,
        targetMessageId: row.log.targetMessageId,
        channelId: row.log.channelId,
        reason: row.log.reason,
        createdAt: row.log.createdAt.toISOString(),
      })),
      total: countRows[0]?.count ?? 0,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(
        1,
        Math.ceil((countRows[0]?.count ?? 0) / params.limit),
      ),
    };
  }
}
