import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, sql, sum } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { MessageResponse, SearchOptions } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  moderationActions,
  moderationReports,
  type ModerationReportStatus,
} from '../database/schema/moderation.schema';
import { aiDetectedActions } from '../database/schema/ai-actions.schema';
import { conversationSummaries } from '../database/schema/conversation-summaries.schema';
import { messageTranslations } from '../database/schema/message-translations.schema';
import { projectDocuments } from '../database/schema/project-documents.schema';
import { projects } from '../database/schema/projects.schema';
import { departments } from '../database/schema/departments.schema';
import { users } from '../database/schema/users.schema';
import { StreamService } from '../stream/stream.service';
import { AnalyticsScopeService } from './analytics-scope.service';
import type {
  AiByFeature,
  AiDetail,
  AnalyticsOverview,
  AnalyticsDateRange,
  AnalyticsKpi,
  ChannelsDetail,
  MessagesDetail,
  ModerationDetail,
  MostActiveTeam,
  ResponseTimeDetail,
  StorageDetail,
  TeamsDetail,
  UsersDetail,
} from './analytics.types';
import type {
  AnalyticsDetailQueryDto,
  AnalyticsQueryDto,
} from './dto/analytics-query.dto';

const MAX_MESSAGES = 20000;
const SEARCH_PAGE = 100;
const OVERVIEW_CACHE_TTL_MS = 60_000;
const DETAIL_CACHE_TTL_MS = 120_000;
const RESPONSE_TIME_MAX_DELTA_SECONDS = 24 * 60 * 60;

interface ChannelInfo {
  id: string;
  name: string;
  kind: string;
  memberCount: number;
  createdBy: string;
  lastMessageAt: string | null;
  messageCount: number;
  projectId: string | null;
  departmentId: string | null;
}

interface MessageAggregate {
  count: number;
  users: Set<string>;
}

interface ResponseTimeBucket {
  totalSeconds: number;
  samples: number;
}

interface MessageMetrics {
  truncated: boolean;
  total: number;
  daily: Map<string, MessageAggregate>;
  perChannel: Map<string, MessageAggregate>;
  perUser: Map<string, MessageAggregate>;
  responseTime: ResponseTimeBucket;
  responseByChannel: Map<string, ResponseTimeBucket>;
}

interface CacheEntry {
  expires: number;
  value: unknown;
}

function channelIdFromMessage(message: MessageResponse): string | null {
  const cid = message.cid ?? message.channel?.cid;
  if (!cid) return null;
  return cid.split(':')[1] ?? null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function pct(current: number, previous: number): number | null {
  if (!previous) return null;
  return round1(((current - previous) / previous) * 100);
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly scopeService: AnalyticsScopeService,
  ) { }

  // ---------------------------------------------------------------------------
  // Cache helpers
  // ---------------------------------------------------------------------------

  private async cached<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value as T;
    }
    const value = await compute();
    this.cache.set(key, { expires: Date.now() + ttlMs, value });
    return value;
  }

  // ---------------------------------------------------------------------------
  // Date range
  // ---------------------------------------------------------------------------

  private resolveRange(query: AnalyticsQueryDto): AnalyticsDateRange {
    let end: Date;
    let start: Date;

    if (query.startDate && query.endDate) {
      start = new Date(query.startDate);
      end = new Date(query.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        start = new Date();
        end = new Date();
      }
    } else {
      const days = parseInt(query.range ?? '30', 10);
      end = new Date();
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const windowMs = Math.max(1, end.getTime() - start.getTime());
    const previousEnd = new Date(start.getTime());
    const previousStart = new Date(previousEnd.getTime() - windowMs);

    return {
      start,
      end,
      previousStart,
      previousEnd,
      days: Math.max(1, Math.round(windowMs / (24 * 60 * 60 * 1000))),
    };
  }

  // ---------------------------------------------------------------------------
  // Channels
  // ---------------------------------------------------------------------------

  private async queryAllChannels(): Promise<ChannelInfo[]> {
    const client = this.streamService.getClient();
    const channels: ChannelInfo[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
      const batch = await client.queryChannels(
        { type: 'messaging' },
        {},
        { limit, offset },
      );
      for (const ch of batch) {
        const data = (ch.data ?? {}) as Record<string, unknown>;
        channels.push({
          id: ch.id ?? '',
          name: (data.name as string) ?? '',
          kind: (data.channel_kind as string) ?? 'direct',
          memberCount:
            (data.member_count as number) ??
            Object.keys(ch.state?.members ?? {}).length ??
            0,
          createdBy: (data.created_by_id as string) ?? '',
          lastMessageAt: (data.last_message_at as string) ?? null,
          messageCount: (data.message_count as number) ?? 0,
          projectId: (data.project_id as string) ?? null,
          departmentId: (data.department_id as string) ?? null,
        });
      }
      if (batch.length < limit) break;
      offset += limit;
      if (offset > 1000) break; // safety cap
    }
    return channels;
  }

  /**
   * Returns the channels the actor may analyze. Platform roles see all
   * channels; managers see only their managed channel set.
   */
  private async getChannels(
    channelIds: string[] | null,
  ): Promise<ChannelInfo[]> {
    const key = `channels|${channelIds === null ? 'all' : channelIds.join(',')}`;
    return this.cached(key, DETAIL_CACHE_TTL_MS, async () => {
      const all = await this.queryAllChannels();
      if (channelIds === null) return all;
      const allowed = new Set(channelIds);
      return all.filter((c) => allowed.has(c.id));
    });
  }

  /**
   * Resolves which channels a query should cover. Validates that a requested
   * channel/team/department filter stays within the actor's allowed set.
   */
  private async resolveEffectiveChannelIds(
    access: { channelIds: string[] | null },
    query: AnalyticsQueryDto,
  ): Promise<string[] | null> {
    const allowed = new Set(access.channelIds ?? []);

    let effective: string[] | null = null;

    if (query.channelId) {
      effective = [query.channelId];
    } else if (query.teamId) {
      const [project] = await this.db
        .select({ channelId: projects.channelId })
        .from(projects)
        .where(eq(projects.id, query.teamId));
      if (project?.channelId) effective = [project.channelId];
      const [dept] = await this.db
        .select({ channelId: departments.channelId })
        .from(departments)
        .where(eq(departments.id, query.teamId));
      if (dept?.channelId) effective = [dept.channelId];
      if (effective === null) effective = [];
    } else if (query.departmentId) {
      const [dept] = await this.db
        .select({ channelId: departments.channelId })
        .from(departments)
        .where(eq(departments.id, query.departmentId));
      effective = dept?.channelId ? [dept.channelId] : [];
    }

    if (effective === null) return access.channelIds;

    if (access.channelIds !== null) {
      const valid = effective.filter((id) => allowed.has(id));
      if (valid.length !== effective.length) {
        return [];
      }
    }
    return effective;
  }

  private buildSearchFilter(
    channelIds: string[] | null,
  ): Record<string, unknown> {
    if (channelIds === null) return { type: 'messaging' };
    if (channelIds.length === 0) return { cid: { $eq: 'messaging:__none__' } };
    return { cid: { $in: channelIds.map((id) => `messaging:${id}`) } };
  }

  // ---------------------------------------------------------------------------
  // Message search + aggregation
  // ---------------------------------------------------------------------------

  private async searchMessages(
    channelFilter: Record<string, unknown>,
    range: { start: Date; end: Date },
  ): Promise<{ messages: MessageResponse[]; truncated: boolean }> {
    const client = this.streamService.getClient();
    const messages: MessageResponse[] = [];
    let next: string | undefined;
    let pages = 0;
    let truncated = false;

    const messageFilter: Record<string, unknown> = {
      $and: [
        { created_at: { $gte: range.start.toISOString() } },
        { created_at: { $lte: range.end.toISOString() } },
      ],
    };

    while (true) {
      const options: SearchOptions = {
        limit: SEARCH_PAGE,
        sort: { created_at: 1 },
      };
      if (next) options.next = next;

      const res = await client.search(channelFilter, messageFilter, options);

      pages += 1;
      for (const r of res.results) {
        const m = r.message;
        if (!m || m.deleted_at) continue;
        if (m.type && m.type !== 'regular') continue;
        messages.push(m);
        if (messages.length >= MAX_MESSAGES) {
          truncated = true;
          break;
        }
      }
      next = res.next;

      if (messages.length >= MAX_MESSAGES || !next) break;
      if (pages > MAX_MESSAGES / SEARCH_PAGE + 2) {
        truncated = true;
        break;
      }
    }

    return { messages, truncated };
  }

  private aggregateMessages(messages: MessageResponse[]): MessageMetrics {
    const daily = new Map<string, MessageAggregate>();
    const perChannel = new Map<string, MessageAggregate>();
    const perUser = new Map<string, MessageAggregate>();
    const responseByChannel = new Map<string, ResponseTimeBucket>();

    for (const message of messages) {
      const createdAt = message.created_at
        ? new Date(message.created_at)
        : null;
      const channelId = channelIdFromMessage(message);
      const userId = message.user?.id ?? '';

      if (createdAt) {
        const key = dayKey(createdAt);
        let agg = daily.get(key);
        if (!agg) {
          agg = { count: 0, users: new Set() };
          daily.set(key, agg);
        }
        agg.count += 1;
        if (userId) agg.users.add(userId);
      }

      if (channelId) {
        let agg = perChannel.get(channelId);
        if (!agg) {
          agg = { count: 0, users: new Set() };
          perChannel.set(channelId, agg);
        }
        agg.count += 1;
        if (userId) agg.users.add(userId);
      }

      if (userId) {
        let agg = perUser.get(userId);
        if (!agg) {
          agg = { count: 0, users: new Set() };
          perUser.set(userId, agg);
        }
        agg.count += 1;
      }
    }

    // Average response time: time between two consecutive messages in the same
    // channel sent by different users.
    const timesByChannel = new Map<string, number[]>();
    for (const message of messages) {
      const channelId = channelIdFromMessage(message);
      if (!channelId || !message.created_at) continue;
      const list = timesByChannel.get(channelId) ?? [];
      list.push(new Date(message.created_at).getTime());
      timesByChannel.set(channelId, list);
    }

    let totalSeconds = 0;
    let samples = 0;
    for (const [channelId, times] of timesByChannel) {
      times.sort((a, b) => a - b);
      let bucketTotal = 0;
      let bucketSamples = 0;
      for (let i = 1; i < times.length; i += 1) {
        const deltaSec = (times[i] - times[i - 1]) / 1000;
        if (deltaSec < 0 || deltaSec > RESPONSE_TIME_MAX_DELTA_SECONDS)
          continue;
        bucketTotal += deltaSec;
        bucketSamples += 1;
      }
      if (bucketSamples > 0) {
        responseByChannel.set(channelId, {
          totalSeconds: bucketTotal,
          samples: bucketSamples,
        });
        totalSeconds += bucketTotal;
        samples += bucketSamples;
      }
    }

    return {
      truncated: false,
      total: messages.length,
      daily,
      perChannel,
      perUser,
      responseTime: { totalSeconds, samples },
      responseByChannel,
    };
  }

  private async messageMetrics(
    access: { channelIds: string[] | null },
    range: AnalyticsDateRange,
    query: AnalyticsQueryDto,
    window: 'current' | 'previous',
  ): Promise<MessageMetrics> {
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const channelFilter = this.buildSearchFilter(effective);
    const windowRange =
      window === 'current'
        ? { start: range.start, end: range.end }
        : { start: range.previousStart, end: range.previousEnd };

    const cacheKey = [
      'msg',
      access.channelIds === null ? 'all' : access.channelIds.join(','),
      window,
      windowRange.start.toISOString(),
      windowRange.end.toISOString(),
      query.channelId ?? '',
      query.teamId ?? '',
      query.departmentId ?? '',
    ].join('|');

    return this.cached(cacheKey, OVERVIEW_CACHE_TTL_MS, async () => {
      const { messages, truncated } = await this.searchMessages(
        channelFilter,
        windowRange,
      );
      const metrics = this.aggregateMessages(messages);
      metrics.truncated = truncated;
      return metrics;
    });
  }

  // ---------------------------------------------------------------------------
  // KPI + chart helpers
  // ---------------------------------------------------------------------------

  private buildDailySeries(
    start: Date,
    end: Date,
    daily: Map<string, MessageAggregate>,
  ): { date: string; messages: number; activeUsers: number }[] {
    const series: { date: string; messages: number; activeUsers: number }[] =
      [];
    const cursor = new Date(start);
    cursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setUTCHours(23, 59, 59, 999);

    while (cursor.getTime() <= endDay.getTime()) {
      const key = cursor.toISOString().slice(0, 10);
      const agg = daily.get(key);
      series.push({
        date: key,
        messages: agg?.count ?? 0,
        activeUsers: agg?.users.size ?? 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return series;
  }

  private async storageNumbers(
    scope: { channelIds: string[] | null },
    before: Date | null,
  ): Promise<{ bytes: number; documents: number }> {
    const conditions = [];
    if (before) conditions.push(sql`${projectDocuments.createdAt} < ${before}`);
    if (scope.channelIds !== null && scope.channelIds.length > 0) {
      conditions.push(inArray(projects.channelId, scope.channelIds));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await this.db
      .select({
        bytes: sum(projectDocuments.sizeBytes),
        documents: sql<number>`count(*)::int`,
      })
      .from(projectDocuments)
      .innerJoin(projects, eq(projectDocuments.projectId, projects.id))
      .where(where);

    const row = rows[0];
    return {
      bytes: Number(row?.bytes ?? 0),
      documents: row?.documents ?? 0,
    };
  }

  private async aiCounts(
    scope: { channelIds: string[] | null },
    range: { start: Date; end: Date },
  ): Promise<{
    summaries: number;
    translations: number;
    actions: number;
    total: number;
  }> {
    const inScope = scope.channelIds !== null && scope.channelIds.length > 0;

    const summariesScope = inScope
      ? inArray(conversationSummaries.channelId, scope.channelIds!)
      : undefined;
    const actionsScope = inScope
      ? inArray(aiDetectedActions.channelId, scope.channelIds!)
      : undefined;

    const [summariesRow, translationsRow, actionsRow] = await Promise.all([
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(conversationSummaries)
        .where(
          and(
            sql`${conversationSummaries.generatedAt} >= ${range.start}`,
            sql`${conversationSummaries.generatedAt} <= ${range.end}`,
            ...(summariesScope ? [summariesScope] : []),
          ),
        ),
      // Translations are not channel-scoped in the DB; only counted when the
      // actor has a platform-wide view.
      scope.channelIds === null
        ? this.db
          .select({ n: sql<number>`count(*)::int` })
          .from(messageTranslations)
          .where(
            and(
              sql`${messageTranslations.createdAt} >= ${range.start}`,
              sql`${messageTranslations.createdAt} <= ${range.end}`,
            ),
          )
        : Promise.resolve([{ n: 0 }]),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(aiDetectedActions)
        .where(
          and(
            sql`${aiDetectedActions.detectedAt} >= ${range.start}`,
            sql`${aiDetectedActions.detectedAt} <= ${range.end}`,
            ...(actionsScope ? [actionsScope] : []),
          ),
        ),
    ]);

    const summaries = summariesRow[0]?.n ?? 0;
    const translations = translationsRow[0]?.n ?? 0;
    const actions = actionsRow[0]?.n ?? 0;
    return {
      summaries,
      translations,
      actions,
      total: summaries + translations + actions,
    };
  }

  private async moderationNumbers(
    scope: { channelIds: string[] | null },
    range: { start: Date; end: Date },
  ): Promise<{ reports: number; actions: number }> {
    const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
    const reportScope = inScope
      ? inArray(moderationReports.channelId, scope.channelIds!)
      : undefined;
    const actionScope = inScope
      ? inArray(moderationActions.channelId, scope.channelIds!)
      : undefined;

    const [reportsRow, actionsRow] = await Promise.all([
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(moderationReports)
        .where(
          and(
            sql`${moderationReports.createdAt} >= ${range.start}`,
            sql`${moderationReports.createdAt} <= ${range.end}`,
            ...(reportScope ? [reportScope] : []),
          ),
        ),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(moderationActions)
        .where(
          and(
            sql`${moderationActions.createdAt} >= ${range.start}`,
            sql`${moderationActions.createdAt} <= ${range.end}`,
            ...(actionScope ? [actionScope] : []),
          ),
        ),
    ]);

    return {
      reports: reportsRow[0]?.n ?? 0,
      actions: actionsRow[0]?.n ?? 0,
    };
  }

  private async pendingReports(scope: {
    channelIds: string[] | null;
  }): Promise<number> {
    const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(moderationReports)
      .where(
        and(
          eq(moderationReports.status, 'pending' as ModerationReportStatus),
          ...(inScope
            ? [inArray(moderationReports.channelId, scope.channelIds!)]
            : []),
        ),
      );
    return rows[0]?.n ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  private async filterOptions(
    access: { scope: 'platform' | 'managed'; channelIds: string[] | null },
    actorUsername: string,
  ) {
    const channels = await this.getChannels(access.channelIds);

    let departmentsRows = await this.db.select().from(departments);
    let projectRows = await this.db
      .select({ project: projects, channelId: projects.channelId })
      .from(projects);

    if (access.channelIds !== null) {
      const allowed = new Set(access.channelIds);
      departmentsRows = departmentsRows.filter(
        (d) =>
          d.createdBy === actorUsername ||
          (d.channelId !== null && allowed.has(d.channelId)),
      );
      projectRows = projectRows.filter(
        (p) => p.channelId !== null && allowed.has(p.channelId),
      );
    }

    const teams = [
      ...projectRows.map((p) => ({
        id: p.project.id,
        name: p.project.name,
        kind: 'project',
        channelId: p.channelId ?? '',
      })),
      ...departmentsRows
        .filter((d) => d.channelId)
        .map((d) => ({
          id: d.id,
          name: d.name,
          kind: 'department',
          channelId: d.channelId ?? '',
        })),
    ].filter((t) => t.channelId);

    return {
      teams,
      departments: departmentsRows.map((d) => ({
        id: d.id,
        name: d.name,
        channelId: d.channelId,
      })),
      channels: channels
        .filter((c) => c.name)
        .map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    };
  }

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  async overview(
    username: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverview> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const cacheKey = [
      'overview',
      access.channelIds === null ? 'all' : access.channelIds.join(','),
      range.start.toISOString(),
      range.end.toISOString(),
      query.channelId ?? '',
      query.teamId ?? '',
      query.departmentId ?? '',
    ].join('|');

    return this.cached(cacheKey, OVERVIEW_CACHE_TTL_MS, async () => {
      const scope = { channelIds: effective };
      const [current, previous, channels] = await Promise.all([
        this.messageMetrics(access, range, query, 'current'),
        this.messageMetrics(access, range, query, 'previous'),
        this.getChannels(effective),
      ]);

      const channelByName = new Map(channels.map((c) => [c.id, c]));

      const channelSet = new Set(effective ?? channels.map((c) => c.id));
      const activeChannelsCurrent = channels.filter(
        (c) =>
          channelSet.has(c.id) &&
          c.lastMessageAt &&
          new Date(c.lastMessageAt) >= range.start &&
          new Date(c.lastMessageAt) <= range.end,
      ).length;
      const activeChannelsPrevious = channels.filter(
        (c) =>
          channelSet.has(c.id) &&
          c.lastMessageAt &&
          new Date(c.lastMessageAt) >= range.previousStart &&
          new Date(c.lastMessageAt) < range.previousEnd,
      ).length;

      // Most active teams: channels ranked by messages sent in the window.
      const teamRows = Array.from(current.perChannel.entries())
        .map(([channelId, agg]) => {
          const info = channelByName.get(channelId);
          return {
            channelId,
            name: info?.name ?? channelId,
            kind: info?.kind ?? 'direct',
            teamId: info?.projectId ?? info?.departmentId ?? null,
            messageCount: agg.count,
            activeUsers: agg.users.size,
            memberCount: info?.memberCount ?? 0,
          };
        })
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5);

      const [storageCurrent, storagePrevious] = await Promise.all([
        this.storageNumbers(scope, null),
        this.storageNumbers(scope, range.start),
      ]);

      const [aiCurrent, aiPrevious] = await Promise.all([
        this.aiCounts(scope, range),
        this.aiCounts(scope, {
          start: range.previousStart,
          end: range.previousEnd,
        }),
      ]);

      const [modCurrent, modPrevious] = await Promise.all([
        this.moderationNumbers(scope, range),
        this.moderationNumbers(scope, {
          start: range.previousStart,
          end: range.previousEnd,
        }),
      ]);

      const pending = await this.pendingReports(scope);

      const kpi = (
        value: number,
        previous: number,
        unit?: string,
      ): AnalyticsKpi => ({
        value,
        previous: previous || null,
        changePct: pct(value, previous),
        unit,
      });

      const messageActivity = this.buildDailySeries(
        range.start,
        range.end,
        current.daily,
      );

      const storageDaily = await this.storageDailySeries(
        scope,
        range.start,
        range.end,
      );

      const aiDaily = await this.aiDailySeries(scope, range.start, range.end);

      const moderationDaily = await this.moderationDailySeries(
        scope,
        range.start,
        range.end,
      );

      const filters = await this.filterOptions(access, actor.username);

      const responseTimeSeconds = current.responseTime.samples
        ? current.responseTime.totalSeconds / current.responseTime.samples
        : null;

      return {
        scope: access.scope,
        range: {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          previousStart: range.previousStart.toISOString(),
          previousEnd: range.previousEnd.toISOString(),
          days: range.days,
        },
        generatedAt: new Date().toISOString(),
        truncated: current.truncated,
        kpis: {
          totalMessages: kpi(current.total, previous.total, 'messages'),
          activeUsers: kpi(
            current.perUser.size,
            previous.perUser.size,
            'users',
          ),
          activeChannels: kpi(
            activeChannelsCurrent,
            activeChannelsPrevious,
            'channels',
          ),
          averageResponseTime: kpi(
            responseTimeSeconds ?? 0,
            previous.responseTime.samples
              ? previous.responseTime.totalSeconds /
              previous.responseTime.samples
              : 0,
            'seconds',
          ),
          mostActiveTeams: teamRows,
          storageUsage: kpi(
            storageCurrent.bytes,
            storagePrevious.bytes,
            'bytes',
          ),
          aiUsage: kpi(aiCurrent.total, aiPrevious.total, 'operations'),
          pendingReports: kpi(pending, 0, 'reports'),
          moderationActivity: kpi(
            modCurrent.actions,
            modPrevious.actions,
            'actions',
          ),
        },
        charts: {
          messageActivity,
          teamActivity: teamRows.map((t) => ({
            channelId: t.channelId,
            name: t.name,
            kind: t.kind,
            messageCount: t.messageCount,
            activeUsers: t.activeUsers,
            memberCount: t.memberCount,
          })),
          storageUsage: storageDaily,
          aiUsage: aiDaily,
          moderation: moderationDaily,
        },
        filters,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Detail series helpers
  // ---------------------------------------------------------------------------

  private async storageDailySeries(
    scope: { channelIds: string[] | null },
    start: Date,
    end: Date,
  ) {
    const rows = await this.db
      .select({
        date: sql<string>`to_char(${projectDocuments.createdAt}, 'YYYY-MM-DD')`,
        bytes: sql<number>`sum(${projectDocuments.sizeBytes})::bigint`,
        documents: sql<number>`count(*)::int`,
      })
      .from(projectDocuments)
      .innerJoin(projects, eq(projectDocuments.projectId, projects.id))
      .where(
        and(
          sql`${projectDocuments.createdAt} >= ${start}`,
          sql`${projectDocuments.createdAt} <= ${end}`,
          ...(scope.channelIds !== null && scope.channelIds.length > 0
            ? [inArray(projects.channelId, scope.channelIds)]
            : []),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const byDate = new Map(rows.map((r) => [r.date, r]));
    return this.buildDateSeries(start, end, (key) => ({
      date: key,
      bytes: Number(byDate.get(key)?.bytes ?? 0),
      documents: byDate.get(key)?.documents ?? 0,
    }));
  }

  private async aiDailySeries(
    scope: { channelIds: string[] | null },
    start: Date,
    end: Date,
  ) {
    const inScope = scope.channelIds !== null && scope.channelIds.length > 0;

    const [summaries, translations, actions] = await Promise.all([
      this.db
        .select({
          date: sql<string>`to_char(${conversationSummaries.generatedAt}, 'YYYY-MM-DD')`,
          n: sql<number>`count(*)::int`,
        })
        .from(conversationSummaries)
        .where(
          and(
            sql`${conversationSummaries.generatedAt} >= ${start}`,
            sql`${conversationSummaries.generatedAt} <= ${end}`,
            ...(inScope
              ? [inArray(conversationSummaries.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(sql`1`),
      scope.channelIds === null
        ? this.db
          .select({
            date: sql<string>`to_char(${messageTranslations.createdAt}, 'YYYY-MM-DD')`,
            n: sql<number>`count(*)::int`,
          })
          .from(messageTranslations)
          .where(
            and(
              sql`${messageTranslations.createdAt} >= ${start}`,
              sql`${messageTranslations.createdAt} <= ${end}`,
            ),
          )
          .groupBy(sql`1`)
        : Promise.resolve([]),
      this.db
        .select({
          date: sql<string>`to_char(${aiDetectedActions.detectedAt}, 'YYYY-MM-DD')`,
          n: sql<number>`count(*)::int`,
        })
        .from(aiDetectedActions)
        .where(
          and(
            sql`${aiDetectedActions.detectedAt} >= ${start}`,
            sql`${aiDetectedActions.detectedAt} <= ${end}`,
            ...(inScope
              ? [inArray(aiDetectedActions.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(sql`1`),
    ]);

    const sumMap = new Map<string, { s: number; t: number; a: number }>();
    for (const row of summaries) {
      const entry = sumMap.get(row.date) ?? { s: 0, t: 0, a: 0 };
      entry.s += row.n;
      sumMap.set(row.date, entry);
    }
    for (const row of translations) {
      const entry = sumMap.get(row.date) ?? { s: 0, t: 0, a: 0 };
      entry.t += row.n;
      sumMap.set(row.date, entry);
    }
    for (const row of actions) {
      const entry = sumMap.get(row.date) ?? { s: 0, t: 0, a: 0 };
      entry.a += row.n;
      sumMap.set(row.date, entry);
    }

    return this.buildDateSeries(start, end, (key) => {
      const e = sumMap.get(key);
      const total = (e?.s ?? 0) + (e?.t ?? 0) + (e?.a ?? 0);
      return {
        date: key,
        total,
        summaries: e?.s ?? 0,
        translations: e?.t ?? 0,
        actions: e?.a ?? 0,
      };
    });
  }

  private async moderationDailySeries(
    scope: { channelIds: string[] | null },
    start: Date,
    end: Date,
  ) {
    const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
    const [reports, actions] = await Promise.all([
      this.db
        .select({
          date: sql<string>`to_char(${moderationReports.createdAt}, 'YYYY-MM-DD')`,
          n: sql<number>`count(*)::int`,
        })
        .from(moderationReports)
        .where(
          and(
            sql`${moderationReports.createdAt} >= ${start}`,
            sql`${moderationReports.createdAt} <= ${end}`,
            ...(inScope
              ? [inArray(moderationReports.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(sql`1`),
      this.db
        .select({
          date: sql<string>`to_char(${moderationActions.createdAt}, 'YYYY-MM-DD')`,
          n: sql<number>`count(*)::int`,
        })
        .from(moderationActions)
        .where(
          and(
            sql`${moderationActions.createdAt} >= ${start}`,
            sql`${moderationActions.createdAt} <= ${end}`,
            ...(inScope
              ? [inArray(moderationActions.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(sql`1`),
    ]);

    const reportMap = new Map(reports.map((r) => [r.date, r.n]));
    const actionMap = new Map(actions.map((a) => [a.date, a.n]));

    return this.buildDateSeries(start, end, (key) => ({
      date: key,
      reports: reportMap.get(key) ?? 0,
      actions: actionMap.get(key) ?? 0,
    }));
  }

  private buildDateSeries<T>(
    start: Date,
    end: Date,
    build: (key: string) => T,
  ): T[] {
    const series: T[] = [];
    const cursor = new Date(start);
    cursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setUTCHours(23, 59, 59, 999);
    while (cursor.getTime() <= endDay.getTime()) {
      const key = cursor.toISOString().slice(0, 10);
      series.push(build(key));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return series;
  }

  // ---------------------------------------------------------------------------
  // Detail endpoints
  // ---------------------------------------------------------------------------

  async messagesDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<MessagesDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const channels = await this.getChannels(effective);
    const channelByName = new Map(channels.map((c) => [c.id, c]));

    const metrics = await this.messageMetrics(access, range, query, 'current');

    const topSenders = Array.from(metrics.perUser.entries())
      .map(([userId, agg]) => ({ userId, count: agg.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const senderNames = await this.userNameMap(topSenders.map((s) => s.userId));

    const byChannel = Array.from(metrics.perChannel.entries())
      .map(([channelId, agg]) => {
        const info = channelByName.get(channelId);
        return {
          channelId,
          name: info?.name ?? channelId,
          kind: info?.kind ?? 'direct',
          messageCount: agg.count,
          activeUsers: agg.users.size,
        };
      })
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      truncated: metrics.truncated,
      total: metrics.total,
      daily: this.buildDailySeries(range.start, range.end, metrics.daily),
      topSenders: topSenders.map((s) => ({
        userId: s.userId,
        name: senderNames.get(s.userId)?.name ?? s.userId,
        imageUrl: senderNames.get(s.userId)?.imageUrl ?? null,
        messageCount: s.count,
      })),
      byChannel,
    };
  }

  async usersDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<UsersDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const metrics = await this.messageMetrics(access, range, query, 'current');

    const sorted = Array.from(metrics.perUser.entries())
      .map(([userId, agg]) => ({ userId, count: agg.count }))
      .sort((a, b) => b.count - a.count);

    const userIds = sorted.map((s) => s.userId);
    const nameMap = await this.userNameMap(userIds);

    let presence = new Map<
      string,
      { online: boolean; lastActive: string | null }
    >();
    if (userIds.length > 0) {
      try {
        presence = await this.streamService.getUsersPresence(userIds);
      } catch (err) {
        this.logger.warn(`Presence fetch failed: ${err}`);
      }
    }

    const [totalUsersRow] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(users);

    const active = sorted.slice(0, 100).map((s) => {
      const meta = nameMap.get(s.userId);
      const p = presence.get(s.userId);
      return {
        userId: s.userId,
        name: meta?.name ?? s.userId,
        imageUrl: meta?.imageUrl ?? null,
        messageCount: s.count,
        online: p?.online ?? false,
        lastActive: p?.lastActive ?? null,
      };
    });

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      truncated: metrics.truncated,
      totalActive: metrics.perUser.size,
      totalRegistered: totalUsersRow?.n ?? 0,
      daily: this.buildDailySeries(range.start, range.end, metrics.daily),
      active,
    };
  }

  async channelsDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<ChannelsDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const channels = await this.getChannels(effective);
    const metrics = await this.messageMetrics(access, range, query, 'current');

    const items = channels
      .map((c) => {
        const agg = metrics.perChannel.get(c.id);
        return {
          channelId: c.id,
          name: c.name || c.id,
          kind: c.kind,
          messageCount: agg?.count ?? 0,
          memberCount: c.memberCount,
          activeUsers: agg?.users.size ?? 0,
          createdBy: c.createdBy,
          lastMessageAt: c.lastMessageAt,
        };
      })
      .filter((c) => c.messageCount > 0 || c.lastMessageAt !== null)
      .sort((a, b) => b.messageCount - a.messageCount);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const paginated = items.slice(offset, offset + limit);

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      truncated: metrics.truncated,
      items: paginated,
      total: items.length,
    };
  }

  async teamsDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<TeamsDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const channels = await this.getChannels(effective);
    const channelByName = new Map(channels.map((c) => [c.id, c]));
    const metrics = await this.messageMetrics(access, range, query, 'current');

    const items: MostActiveTeam[] = Array.from(metrics.perChannel.entries())
      .map(([channelId, agg]) => {
        const info = channelByName.get(channelId);
        return {
          channelId,
          name: info?.name ?? channelId,
          kind: info?.kind ?? 'direct',
          teamId: info?.projectId ?? info?.departmentId ?? null,
          messageCount: agg.count,
          activeUsers: agg.users.size,
          memberCount: info?.memberCount ?? 0,
        };
      })
      .sort((a, b) => b.messageCount - a.messageCount);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      truncated: metrics.truncated,
      items: items.slice(offset, offset + limit),
    };
  }

  async storageDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<StorageDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const scope = { channelIds: effective };

    const [total, byProject, byMime, daily] = await Promise.all([
      this.storageNumbers(scope, null),
      this.db
        .select({
          projectId: projects.id,
          name: projects.name,
          bytes: sql<number>`sum(${projectDocuments.sizeBytes})::bigint`,
          documents: sql<number>`count(*)::int`,
        })
        .from(projectDocuments)
        .innerJoin(projects, eq(projectDocuments.projectId, projects.id))
        .where(
          scope.channelIds !== null && scope.channelIds.length > 0
            ? inArray(projects.channelId, scope.channelIds)
            : undefined,
        )
        .groupBy(projects.id, projects.name)
        .orderBy(sql`2 desc`),
      this.db
        .select({
          mimeType: projectDocuments.mimeType,
          bytes: sql<number>`sum(${projectDocuments.sizeBytes})::bigint`,
          documents: sql<number>`count(*)::int`,
        })
        .from(projectDocuments)
        .innerJoin(projects, eq(projectDocuments.projectId, projects.id))
        .where(
          scope.channelIds !== null && scope.channelIds.length > 0
            ? inArray(projects.channelId, scope.channelIds)
            : undefined,
        )
        .groupBy(projectDocuments.mimeType)
        .orderBy(sql`2 desc`),
      this.storageDailySeries(scope, range.start, range.end),
    ]);

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      totalBytes: total.bytes,
      totalDocuments: total.documents,
      byProject: byProject.map((r) => ({
        projectId: r.projectId,
        name: r.name,
        bytes: Number(r.bytes ?? 0),
        documents: r.documents ?? 0,
      })),
      byMime: byMime.map((r) => ({
        mimeType: r.mimeType,
        bytes: Number(r.bytes ?? 0),
        documents: r.documents ?? 0,
      })),
      daily,
    };
  }

  async aiDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<AiDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const scope = { channelIds: effective };
    const inScope = effective !== null && effective.length > 0;

    const current = await this.aiCounts(scope, range);
    const previous = await this.aiCounts(scope, {
      start: range.previousStart,
      end: range.previousEnd,
    });

    const [intentRows, providerRows, daily] = await Promise.all([
      this.db
        .select({
          intentType: aiDetectedActions.intentType,
          n: sql<number>`count(*)::int`,
        })
        .from(aiDetectedActions)
        .where(
          and(
            sql`${aiDetectedActions.detectedAt} >= ${range.start}`,
            sql`${aiDetectedActions.detectedAt} <= ${range.end}`,
            ...(inScope
              ? [inArray(aiDetectedActions.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(aiDetectedActions.intentType),
      this.db
        .select({
          provider: conversationSummaries.provider,
          n: sql<number>`count(*)::int`,
        })
        .from(conversationSummaries)
        .where(
          and(
            sql`${conversationSummaries.generatedAt} >= ${range.start}`,
            sql`${conversationSummaries.generatedAt} <= ${range.end}`,
            ...(inScope
              ? [inArray(conversationSummaries.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(conversationSummaries.provider),
      this.aiDailySeries(scope, range.start, range.end),
    ]);

    const byFeature: AiByFeature[] = [
      {
        feature: 'summaries',
        count: current.summaries,
        changePct: pct(current.summaries, previous.summaries),
      },
      {
        feature: 'translations',
        count: current.translations,
        changePct: pct(current.translations, previous.translations),
      },
      {
        feature: 'action_detection',
        count: current.actions,
        changePct: pct(current.actions, previous.actions),
      },
    ];

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      total: current.total,
      byFeature,
      byIntent: intentRows.map((r) => ({
        intentType: r.intentType,
        count: r.n,
      })),
      byProvider: providerRows.map((r) => ({
        provider: r.provider,
        count: r.n,
      })),
      daily,
    };
  }

  async moderationDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<ModerationDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const scope = { channelIds: effective };
    const inScope = effective !== null && effective.length > 0;

    const [pending, statusRows, actionRows, daily, recent] = await Promise.all([
      this.pendingReports(scope),
      this.db
        .select({
          status: moderationReports.status,
          n: sql<number>`count(*)::int`,
        })
        .from(moderationReports)
        .where(
          inScope
            ? inArray(moderationReports.channelId, scope.channelIds!)
            : undefined,
        )
        .groupBy(moderationReports.status),
      this.db
        .select({
          actionType: moderationActions.actionType,
          n: sql<number>`count(*)::int`,
        })
        .from(moderationActions)
        .where(
          and(
            sql`${moderationActions.createdAt} >= ${range.start}`,
            sql`${moderationActions.createdAt} <= ${range.end}`,
            ...(inScope
              ? [inArray(moderationActions.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .groupBy(moderationActions.actionType),
      this.moderationDailySeries(scope, range.start, range.end),
      this.db
        .select({
          id: moderationActions.id,
          moderatorId: moderationActions.moderatorId,
          actionType: moderationActions.actionType,
          targetUserId: moderationActions.targetUserId,
          channelId: moderationActions.channelId,
          createdAt: moderationActions.createdAt,
          moderatorFirstName: users.firstName,
          moderatorLastName: users.lastName,
        })
        .from(moderationActions)
        .leftJoin(users, eq(users.username, moderationActions.moderatorId))
        .where(
          and(
            sql`${moderationActions.createdAt} >= ${range.start}`,
            sql`${moderationActions.createdAt} <= ${range.end}`,
            ...(inScope
              ? [inArray(moderationActions.channelId, scope.channelIds!)]
              : []),
          ),
        )
        .orderBy(desc(moderationActions.createdAt))
        .limit(10),
    ]);

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      pendingReports: pending,
      reportsByStatus: statusRows.map((r) => ({
        status: r.status,
        count: r.n,
      })),
      totalActions: actionRows.reduce((acc, r) => acc + r.n, 0),
      actionsByType: actionRows.map((r) => ({
        actionType: r.actionType,
        count: r.n,
      })),
      daily,
      recentActions: recent.map((r) => ({
        id: r.id,
        moderatorId: r.moderatorId,
        moderatorName:
          [r.moderatorFirstName, r.moderatorLastName]
            .filter(Boolean)
            .join(' ') || r.moderatorId,
        actionType: r.actionType,
        targetUserId: r.targetUserId,
        channelId: r.channelId,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async responseTimeDetail(
    username: string,
    query: AnalyticsDetailQueryDto,
  ): Promise<ResponseTimeDetail> {
    const actor = await this.scopeService.requireUser(username);
    const access = await this.scopeService.resolve(actor);
    const range = this.resolveRange(query);
    const effective = await this.resolveEffectiveChannelIds(access, query);
    const channels = await this.getChannels(effective);
    const channelByName = new Map(channels.map((c) => [c.id, c]));
    const metrics = await this.messageMetrics(access, range, query, 'current');

    const byChannel = Array.from(metrics.responseByChannel.entries())
      .map(([channelId, bucket]) => {
        const info = channelByName.get(channelId);
        return {
          channelId,
          name: info?.name ?? channelId,
          averageSeconds: bucket.samples
            ? round1(bucket.totalSeconds / bucket.samples)
            : null,
          samples: bucket.samples,
        };
      })
      .sort((a, b) => (b.averageSeconds ?? 0) - (a.averageSeconds ?? 0))
      .slice(0, 25);

    return {
      scope: access.scope,
      range: this.serializeRange(range),
      generatedAt: new Date().toISOString(),
      averageSeconds: metrics.responseTime.samples
        ? round1(
          metrics.responseTime.totalSeconds / metrics.responseTime.samples,
        )
        : null,
      samples: metrics.responseTime.samples,
      byChannel,
    };
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private serializeRange(range: AnalyticsDateRange) {
    return {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      previousStart: range.previousStart.toISOString(),
      previousEnd: range.previousEnd.toISOString(),
      days: range.days,
    };
  }

  private async userNameMap(
    usernames: string[],
  ): Promise<Map<string, { name: string; imageUrl: string | null }>> {
    const map = new Map<string, { name: string; imageUrl: string | null }>();
    if (usernames.length === 0) return map;
    const rows = await this.db
      .select()
      .from(users)
      .where(inArray(users.username, usernames));
    for (const u of rows) {
      map.set(u.username, {
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
        imageUrl: u.imageUrl,
      });
    }
    return map;
  }
}
