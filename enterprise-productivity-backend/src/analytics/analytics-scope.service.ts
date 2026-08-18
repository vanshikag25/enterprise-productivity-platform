import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { projects, projectMembers } from '../database/schema/projects.schema';
import { departments } from '../database/schema/departments.schema';
import { users, type User } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import type { AnalyticsScope } from './analytics.types';

export interface AnalyticsAccess {
  scope: AnalyticsScope;
  /** null means "all channels"; otherwise the ids this actor may analyze. */
  channelIds: string[] | null;
  actor: User;
}

function isModerator(member: {
  is_moderator?: boolean;
  channel_role?: string;
}): boolean {
  return Boolean(
    member?.is_moderator ||
    member?.channel_role === 'channel_moderator' ||
    member?.channel_role === 'moderator',
  );
}

@Injectable()
export class AnalyticsScopeService {
  private readonly logger = new Logger(AnalyticsScopeService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
  ) {}

  private isPlatformRole(role: User['role']): boolean {
    return (
      role === 'super_admin' ||
      role === 'organization_owner' ||
      role === 'admin'
    );
  }

  /**
   * Resolves the analytics scope for an actor.
   *
   * Super Admins / Org Owners / Admins get a platform-wide view. Managers get
   * the same per-channel scope they are allowed to moderate (channels they
   * created, channels they moderate, project channels where they are
   * owner/manager, and department channels they created). Everyone else is
   * denied. Mirrors the data-access rules used by the moderation module so
   * managers never see channels they do not manage.
   */
  async resolve(actor: User): Promise<AnalyticsAccess> {
    if (this.isPlatformRole(actor.role)) {
      return { scope: 'platform', channelIds: null, actor };
    }

    if (actor.role !== 'manager') {
      throw new ForbiddenException(
        'You do not have permission to view analytics.',
      );
    }

    const channelIds = await this.managedChannelIds(actor);
    return { scope: 'managed', channelIds, actor };
  }

  /**
   * Channel ids a manager may analyze. Mirrors ModerationService logic:
   * project channels where the manager is owner/manager, department channels
   * the manager created, and any Stream channel the manager created or
   * moderates.
   */
  async managedChannelIds(actor: User): Promise<string[]> {
    const ids = new Set<string>();

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

    try {
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
        if (member && isModerator(member) && ch.id) ids.add(ch.id);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to resolve managed channels for ${actor.username}: ${err}`,
      );
    }

    return Array.from(ids);
  }

  /** DB users row for the authenticated auth object. */
  async requireUser(username: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));
    if (!user) {
      throw new ForbiddenException('User profile not found');
    }
    return user;
  }
}
