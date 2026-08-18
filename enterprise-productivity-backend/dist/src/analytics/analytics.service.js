"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const moderation_schema_1 = require("../database/schema/moderation.schema");
const ai_actions_schema_1 = require("../database/schema/ai-actions.schema");
const conversation_summaries_schema_1 = require("../database/schema/conversation-summaries.schema");
const message_translations_schema_1 = require("../database/schema/message-translations.schema");
const project_documents_schema_1 = require("../database/schema/project-documents.schema");
const projects_schema_1 = require("../database/schema/projects.schema");
const departments_schema_1 = require("../database/schema/departments.schema");
const users_schema_1 = require("../database/schema/users.schema");
const stream_service_1 = require("../stream/stream.service");
const analytics_scope_service_1 = require("./analytics-scope.service");
const MAX_MESSAGES = 20000;
const SEARCH_PAGE = 100;
const OVERVIEW_CACHE_TTL_MS = 60_000;
const DETAIL_CACHE_TTL_MS = 120_000;
const RESPONSE_TIME_MAX_DELTA_SECONDS = 24 * 60 * 60;
function channelIdFromMessage(message) {
    const cid = message.cid ?? message.channel?.cid;
    if (!cid)
        return null;
    return cid.split(':')[1] ?? null;
}
function dayKey(date) {
    return date.toISOString().slice(0, 10);
}
function round1(value) {
    return Math.round(value * 10) / 10;
}
function pct(current, previous) {
    if (!previous)
        return null;
    return round1(((current - previous) / previous) * 100);
}
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(db, streamService, scopeService) {
        this.db = db;
        this.streamService = streamService;
        this.scopeService = scopeService;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
        this.cache = new Map();
    }
    async cached(key, ttlMs, compute) {
        const entry = this.cache.get(key);
        if (entry && entry.expires > Date.now()) {
            return entry.value;
        }
        const value = await compute();
        this.cache.set(key, { expires: Date.now() + ttlMs, value });
        return value;
    }
    resolveRange(query) {
        let end;
        let start;
        if (query.startDate && query.endDate) {
            start = new Date(query.startDate);
            end = new Date(query.endDate);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                start = new Date();
                end = new Date();
            }
        }
        else {
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
    async queryAllChannels() {
        const client = this.streamService.getClient();
        const channels = [];
        const limit = 100;
        let offset = 0;
        while (true) {
            const batch = await client.queryChannels({ type: 'messaging' }, {}, { limit, offset });
            for (const ch of batch) {
                const data = (ch.data ?? {});
                channels.push({
                    id: ch.id ?? '',
                    name: data.name ?? '',
                    kind: data.channel_kind ?? 'direct',
                    memberCount: data.member_count ??
                        Object.keys(ch.state?.members ?? {}).length ??
                        0,
                    createdBy: data.created_by_id ?? '',
                    lastMessageAt: data.last_message_at ?? null,
                    messageCount: data.message_count ?? 0,
                    projectId: data.project_id ?? null,
                    departmentId: data.department_id ?? null,
                });
            }
            if (batch.length < limit)
                break;
            offset += limit;
            if (offset > 1000)
                break;
        }
        return channels;
    }
    async getChannels(channelIds) {
        const key = `channels|${channelIds === null ? 'all' : channelIds.join(',')}`;
        return this.cached(key, DETAIL_CACHE_TTL_MS, async () => {
            const all = await this.queryAllChannels();
            if (channelIds === null)
                return all;
            const allowed = new Set(channelIds);
            return all.filter((c) => allowed.has(c.id));
        });
    }
    async resolveEffectiveChannelIds(access, query) {
        const allowed = new Set(access.channelIds ?? []);
        let effective = null;
        if (query.channelId) {
            effective = [query.channelId];
        }
        else if (query.teamId) {
            const [project] = await this.db
                .select({ channelId: projects_schema_1.projects.channelId })
                .from(projects_schema_1.projects)
                .where((0, drizzle_orm_1.eq)(projects_schema_1.projects.id, query.teamId));
            if (project?.channelId)
                effective = [project.channelId];
            const [dept] = await this.db
                .select({ channelId: departments_schema_1.departments.channelId })
                .from(departments_schema_1.departments)
                .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, query.teamId));
            if (dept?.channelId)
                effective = [dept.channelId];
            if (effective === null)
                effective = [];
        }
        else if (query.departmentId) {
            const [dept] = await this.db
                .select({ channelId: departments_schema_1.departments.channelId })
                .from(departments_schema_1.departments)
                .where((0, drizzle_orm_1.eq)(departments_schema_1.departments.id, query.departmentId));
            effective = dept?.channelId ? [dept.channelId] : [];
        }
        if (effective === null)
            return access.channelIds;
        if (access.channelIds !== null) {
            const valid = effective.filter((id) => allowed.has(id));
            if (valid.length !== effective.length) {
                return [];
            }
        }
        return effective;
    }
    buildSearchFilter(channelIds) {
        if (channelIds === null)
            return { type: 'messaging' };
        if (channelIds.length === 0)
            return { cid: { $eq: 'messaging:__none__' } };
        return { cid: { $in: channelIds.map((id) => `messaging:${id}`) } };
    }
    async searchMessages(channelFilter, range) {
        const client = this.streamService.getClient();
        const messages = [];
        let next;
        let pages = 0;
        let truncated = false;
        const messageFilter = {
            $and: [
                { created_at: { $gte: range.start.toISOString() } },
                { created_at: { $lte: range.end.toISOString() } },
            ],
        };
        while (true) {
            const options = {
                limit: SEARCH_PAGE,
                sort: { created_at: 1 },
            };
            if (next)
                options.next = next;
            const res = await client.search(channelFilter, messageFilter, options);
            pages += 1;
            for (const r of res.results) {
                const m = r.message;
                if (!m || m.deleted_at)
                    continue;
                if (m.type && m.type !== 'regular')
                    continue;
                messages.push(m);
                if (messages.length >= MAX_MESSAGES) {
                    truncated = true;
                    break;
                }
            }
            next = res.next;
            if (messages.length >= MAX_MESSAGES || !next)
                break;
            if (pages > MAX_MESSAGES / SEARCH_PAGE + 2) {
                truncated = true;
                break;
            }
        }
        return { messages, truncated };
    }
    aggregateMessages(messages) {
        const daily = new Map();
        const perChannel = new Map();
        const perUser = new Map();
        const responseByChannel = new Map();
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
                if (userId)
                    agg.users.add(userId);
            }
            if (channelId) {
                let agg = perChannel.get(channelId);
                if (!agg) {
                    agg = { count: 0, users: new Set() };
                    perChannel.set(channelId, agg);
                }
                agg.count += 1;
                if (userId)
                    agg.users.add(userId);
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
        const timesByChannel = new Map();
        for (const message of messages) {
            const channelId = channelIdFromMessage(message);
            if (!channelId || !message.created_at)
                continue;
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
    async messageMetrics(access, range, query, window) {
        const effective = await this.resolveEffectiveChannelIds(access, query);
        const channelFilter = this.buildSearchFilter(effective);
        const windowRange = window === 'current'
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
            const { messages, truncated } = await this.searchMessages(channelFilter, windowRange);
            const metrics = this.aggregateMessages(messages);
            metrics.truncated = truncated;
            return metrics;
        });
    }
    buildDailySeries(start, end, daily) {
        const series = [];
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
    async storageNumbers(scope, before) {
        const conditions = [];
        if (before)
            conditions.push((0, drizzle_orm_1.sql) `${project_documents_schema_1.projectDocuments.createdAt} < ${before}`);
        if (scope.channelIds !== null && scope.channelIds.length > 0) {
            conditions.push((0, drizzle_orm_1.inArray)(projects_schema_1.projects.channelId, scope.channelIds));
        }
        const where = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const rows = await this.db
            .select({
            bytes: (0, drizzle_orm_1.sum)(project_documents_schema_1.projectDocuments.sizeBytes),
            documents: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(project_documents_schema_1.projectDocuments)
            .innerJoin(projects_schema_1.projects, (0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projects_schema_1.projects.id))
            .where(where);
        const row = rows[0];
        return {
            bytes: Number(row?.bytes ?? 0),
            documents: row?.documents ?? 0,
        };
    }
    async aiCounts(scope, range) {
        const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
        const summariesScope = inScope
            ? (0, drizzle_orm_1.inArray)(conversation_summaries_schema_1.conversationSummaries.channelId, scope.channelIds)
            : undefined;
        const actionsScope = inScope
            ? (0, drizzle_orm_1.inArray)(ai_actions_schema_1.aiDetectedActions.channelId, scope.channelIds)
            : undefined;
        const [summariesRow, translationsRow, actionsRow] = await Promise.all([
            this.db
                .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(conversation_summaries_schema_1.conversationSummaries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${conversation_summaries_schema_1.conversationSummaries.generatedAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${conversation_summaries_schema_1.conversationSummaries.generatedAt} <= ${range.end}`, ...(summariesScope ? [summariesScope] : []))),
            scope.channelIds === null
                ? this.db
                    .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
                    .from(message_translations_schema_1.messageTranslations)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${message_translations_schema_1.messageTranslations.createdAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${message_translations_schema_1.messageTranslations.createdAt} <= ${range.end}`))
                : Promise.resolve([{ n: 0 }]),
            this.db
                .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(ai_actions_schema_1.aiDetectedActions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} <= ${range.end}`, ...(actionsScope ? [actionsScope] : []))),
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
    async moderationNumbers(scope, range) {
        const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
        const reportScope = inScope
            ? (0, drizzle_orm_1.inArray)(moderation_schema_1.moderationReports.channelId, scope.channelIds)
            : undefined;
        const actionScope = inScope
            ? (0, drizzle_orm_1.inArray)(moderation_schema_1.moderationActions.channelId, scope.channelIds)
            : undefined;
        const [reportsRow, actionsRow] = await Promise.all([
            this.db
                .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(moderation_schema_1.moderationReports)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${moderation_schema_1.moderationReports.createdAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${moderation_schema_1.moderationReports.createdAt} <= ${range.end}`, ...(reportScope ? [reportScope] : []))),
            this.db
                .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
                .from(moderation_schema_1.moderationActions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} <= ${range.end}`, ...(actionScope ? [actionScope] : []))),
        ]);
        return {
            reports: reportsRow[0]?.n ?? 0,
            actions: actionsRow[0]?.n ?? 0,
        };
    }
    async pendingReports(scope) {
        const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
        const rows = await this.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(moderation_schema_1.moderationReports)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(moderation_schema_1.moderationReports.status, 'pending'), ...(inScope
            ? [(0, drizzle_orm_1.inArray)(moderation_schema_1.moderationReports.channelId, scope.channelIds)]
            : [])));
        return rows[0]?.n ?? 0;
    }
    async filterOptions(access, actorUsername) {
        const channels = await this.getChannels(access.channelIds);
        let departmentsRows = await this.db.select().from(departments_schema_1.departments);
        let projectRows = await this.db
            .select({ project: projects_schema_1.projects, channelId: projects_schema_1.projects.channelId })
            .from(projects_schema_1.projects);
        if (access.channelIds !== null) {
            const allowed = new Set(access.channelIds);
            departmentsRows = departmentsRows.filter((d) => d.createdBy === actorUsername ||
                (d.channelId !== null && allowed.has(d.channelId)));
            projectRows = projectRows.filter((p) => p.channelId !== null && allowed.has(p.channelId));
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
    async overview(username, query) {
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
            const activeChannelsCurrent = channels.filter((c) => channelSet.has(c.id) &&
                c.lastMessageAt &&
                new Date(c.lastMessageAt) >= range.start &&
                new Date(c.lastMessageAt) <= range.end).length;
            const activeChannelsPrevious = channels.filter((c) => channelSet.has(c.id) &&
                c.lastMessageAt &&
                new Date(c.lastMessageAt) >= range.previousStart &&
                new Date(c.lastMessageAt) < range.previousEnd).length;
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
            const kpi = (value, previous, unit) => ({
                value,
                previous: previous || null,
                changePct: pct(value, previous),
                unit,
            });
            const messageActivity = this.buildDailySeries(range.start, range.end, current.daily);
            const storageDaily = await this.storageDailySeries(scope, range.start, range.end);
            const aiDaily = await this.aiDailySeries(scope, range.start, range.end);
            const moderationDaily = await this.moderationDailySeries(scope, range.start, range.end);
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
                    activeUsers: kpi(current.perUser.size, previous.perUser.size, 'users'),
                    activeChannels: kpi(activeChannelsCurrent, activeChannelsPrevious, 'channels'),
                    averageResponseTime: kpi(responseTimeSeconds ?? 0, previous.responseTime.samples
                        ? previous.responseTime.totalSeconds /
                            previous.responseTime.samples
                        : 0, 'seconds'),
                    mostActiveTeams: teamRows,
                    storageUsage: kpi(storageCurrent.bytes, storagePrevious.bytes, 'bytes'),
                    aiUsage: kpi(aiCurrent.total, aiPrevious.total, 'operations'),
                    pendingReports: kpi(pending, 0, 'reports'),
                    moderationActivity: kpi(modCurrent.actions, modPrevious.actions, 'actions'),
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
    async storageDailySeries(scope, start, end) {
        const rows = await this.db
            .select({
            date: (0, drizzle_orm_1.sql) `to_char(${project_documents_schema_1.projectDocuments.createdAt}, 'YYYY-MM-DD')`,
            bytes: (0, drizzle_orm_1.sql) `sum(${project_documents_schema_1.projectDocuments.sizeBytes})::bigint`,
            documents: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(project_documents_schema_1.projectDocuments)
            .innerJoin(projects_schema_1.projects, (0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projects_schema_1.projects.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${project_documents_schema_1.projectDocuments.createdAt} >= ${start}`, (0, drizzle_orm_1.sql) `${project_documents_schema_1.projectDocuments.createdAt} <= ${end}`, ...(scope.channelIds !== null && scope.channelIds.length > 0
            ? [(0, drizzle_orm_1.inArray)(projects_schema_1.projects.channelId, scope.channelIds)]
            : [])))
            .groupBy((0, drizzle_orm_1.sql) `1`)
            .orderBy((0, drizzle_orm_1.sql) `1`);
        const byDate = new Map(rows.map((r) => [r.date, r]));
        return this.buildDateSeries(start, end, (key) => ({
            date: key,
            bytes: Number(byDate.get(key)?.bytes ?? 0),
            documents: byDate.get(key)?.documents ?? 0,
        }));
    }
    async aiDailySeries(scope, start, end) {
        const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
        const [summaries, translations, actions] = await Promise.all([
            this.db
                .select({
                date: (0, drizzle_orm_1.sql) `to_char(${conversation_summaries_schema_1.conversationSummaries.generatedAt}, 'YYYY-MM-DD')`,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(conversation_summaries_schema_1.conversationSummaries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${conversation_summaries_schema_1.conversationSummaries.generatedAt} >= ${start}`, (0, drizzle_orm_1.sql) `${conversation_summaries_schema_1.conversationSummaries.generatedAt} <= ${end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(conversation_summaries_schema_1.conversationSummaries.channelId, scope.channelIds)]
                : [])))
                .groupBy((0, drizzle_orm_1.sql) `1`),
            scope.channelIds === null
                ? this.db
                    .select({
                    date: (0, drizzle_orm_1.sql) `to_char(${message_translations_schema_1.messageTranslations.createdAt}, 'YYYY-MM-DD')`,
                    n: (0, drizzle_orm_1.sql) `count(*)::int`,
                })
                    .from(message_translations_schema_1.messageTranslations)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${message_translations_schema_1.messageTranslations.createdAt} >= ${start}`, (0, drizzle_orm_1.sql) `${message_translations_schema_1.messageTranslations.createdAt} <= ${end}`))
                    .groupBy((0, drizzle_orm_1.sql) `1`)
                : Promise.resolve([]),
            this.db
                .select({
                date: (0, drizzle_orm_1.sql) `to_char(${ai_actions_schema_1.aiDetectedActions.detectedAt}, 'YYYY-MM-DD')`,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(ai_actions_schema_1.aiDetectedActions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} >= ${start}`, (0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} <= ${end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(ai_actions_schema_1.aiDetectedActions.channelId, scope.channelIds)]
                : [])))
                .groupBy((0, drizzle_orm_1.sql) `1`),
        ]);
        const sumMap = new Map();
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
    async moderationDailySeries(scope, start, end) {
        const inScope = scope.channelIds !== null && scope.channelIds.length > 0;
        const [reports, actions] = await Promise.all([
            this.db
                .select({
                date: (0, drizzle_orm_1.sql) `to_char(${moderation_schema_1.moderationReports.createdAt}, 'YYYY-MM-DD')`,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(moderation_schema_1.moderationReports)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${moderation_schema_1.moderationReports.createdAt} >= ${start}`, (0, drizzle_orm_1.sql) `${moderation_schema_1.moderationReports.createdAt} <= ${end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(moderation_schema_1.moderationReports.channelId, scope.channelIds)]
                : [])))
                .groupBy((0, drizzle_orm_1.sql) `1`),
            this.db
                .select({
                date: (0, drizzle_orm_1.sql) `to_char(${moderation_schema_1.moderationActions.createdAt}, 'YYYY-MM-DD')`,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(moderation_schema_1.moderationActions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} >= ${start}`, (0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} <= ${end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(moderation_schema_1.moderationActions.channelId, scope.channelIds)]
                : [])))
                .groupBy((0, drizzle_orm_1.sql) `1`),
        ]);
        const reportMap = new Map(reports.map((r) => [r.date, r.n]));
        const actionMap = new Map(actions.map((a) => [a.date, a.n]));
        return this.buildDateSeries(start, end, (key) => ({
            date: key,
            reports: reportMap.get(key) ?? 0,
            actions: actionMap.get(key) ?? 0,
        }));
    }
    buildDateSeries(start, end, build) {
        const series = [];
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
    async messagesDetail(username, query) {
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
    async usersDetail(username, query) {
        const actor = await this.scopeService.requireUser(username);
        const access = await this.scopeService.resolve(actor);
        const range = this.resolveRange(query);
        const metrics = await this.messageMetrics(access, range, query, 'current');
        const sorted = Array.from(metrics.perUser.entries())
            .map(([userId, agg]) => ({ userId, count: agg.count }))
            .sort((a, b) => b.count - a.count);
        const userIds = sorted.map((s) => s.userId);
        const nameMap = await this.userNameMap(userIds);
        let presence = new Map();
        if (userIds.length > 0) {
            try {
                presence = await this.streamService.getUsersPresence(userIds);
            }
            catch (err) {
                this.logger.warn(`Presence fetch failed: ${err}`);
            }
        }
        const [totalUsersRow] = await this.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(users_schema_1.users);
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
    async channelsDetail(username, query) {
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
    async teamsDetail(username, query) {
        const actor = await this.scopeService.requireUser(username);
        const access = await this.scopeService.resolve(actor);
        const range = this.resolveRange(query);
        const effective = await this.resolveEffectiveChannelIds(access, query);
        const channels = await this.getChannels(effective);
        const channelByName = new Map(channels.map((c) => [c.id, c]));
        const metrics = await this.messageMetrics(access, range, query, 'current');
        const items = Array.from(metrics.perChannel.entries())
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
    async storageDetail(username, query) {
        const actor = await this.scopeService.requireUser(username);
        const access = await this.scopeService.resolve(actor);
        const range = this.resolveRange(query);
        const effective = await this.resolveEffectiveChannelIds(access, query);
        const scope = { channelIds: effective };
        const [total, byProject, byMime, daily] = await Promise.all([
            this.storageNumbers(scope, null),
            this.db
                .select({
                projectId: projects_schema_1.projects.id,
                name: projects_schema_1.projects.name,
                bytes: (0, drizzle_orm_1.sql) `sum(${project_documents_schema_1.projectDocuments.sizeBytes})::bigint`,
                documents: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(project_documents_schema_1.projectDocuments)
                .innerJoin(projects_schema_1.projects, (0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projects_schema_1.projects.id))
                .where(scope.channelIds !== null && scope.channelIds.length > 0
                ? (0, drizzle_orm_1.inArray)(projects_schema_1.projects.channelId, scope.channelIds)
                : undefined)
                .groupBy(projects_schema_1.projects.id, projects_schema_1.projects.name)
                .orderBy((0, drizzle_orm_1.sql) `2 desc`),
            this.db
                .select({
                mimeType: project_documents_schema_1.projectDocuments.mimeType,
                bytes: (0, drizzle_orm_1.sql) `sum(${project_documents_schema_1.projectDocuments.sizeBytes})::bigint`,
                documents: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(project_documents_schema_1.projectDocuments)
                .innerJoin(projects_schema_1.projects, (0, drizzle_orm_1.eq)(project_documents_schema_1.projectDocuments.projectId, projects_schema_1.projects.id))
                .where(scope.channelIds !== null && scope.channelIds.length > 0
                ? (0, drizzle_orm_1.inArray)(projects_schema_1.projects.channelId, scope.channelIds)
                : undefined)
                .groupBy(project_documents_schema_1.projectDocuments.mimeType)
                .orderBy((0, drizzle_orm_1.sql) `2 desc`),
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
    async aiDetail(username, query) {
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
                intentType: ai_actions_schema_1.aiDetectedActions.intentType,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(ai_actions_schema_1.aiDetectedActions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${ai_actions_schema_1.aiDetectedActions.detectedAt} <= ${range.end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(ai_actions_schema_1.aiDetectedActions.channelId, scope.channelIds)]
                : [])))
                .groupBy(ai_actions_schema_1.aiDetectedActions.intentType),
            this.db
                .select({
                provider: conversation_summaries_schema_1.conversationSummaries.provider,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(conversation_summaries_schema_1.conversationSummaries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${conversation_summaries_schema_1.conversationSummaries.generatedAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${conversation_summaries_schema_1.conversationSummaries.generatedAt} <= ${range.end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(conversation_summaries_schema_1.conversationSummaries.channelId, scope.channelIds)]
                : [])))
                .groupBy(conversation_summaries_schema_1.conversationSummaries.provider),
            this.aiDailySeries(scope, range.start, range.end),
        ]);
        const byFeature = [
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
    async moderationDetail(username, query) {
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
                status: moderation_schema_1.moderationReports.status,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(moderation_schema_1.moderationReports)
                .where(inScope
                ? (0, drizzle_orm_1.inArray)(moderation_schema_1.moderationReports.channelId, scope.channelIds)
                : undefined)
                .groupBy(moderation_schema_1.moderationReports.status),
            this.db
                .select({
                actionType: moderation_schema_1.moderationActions.actionType,
                n: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(moderation_schema_1.moderationActions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} <= ${range.end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(moderation_schema_1.moderationActions.channelId, scope.channelIds)]
                : [])))
                .groupBy(moderation_schema_1.moderationActions.actionType),
            this.moderationDailySeries(scope, range.start, range.end),
            this.db
                .select({
                id: moderation_schema_1.moderationActions.id,
                moderatorId: moderation_schema_1.moderationActions.moderatorId,
                actionType: moderation_schema_1.moderationActions.actionType,
                targetUserId: moderation_schema_1.moderationActions.targetUserId,
                channelId: moderation_schema_1.moderationActions.channelId,
                createdAt: moderation_schema_1.moderationActions.createdAt,
                moderatorFirstName: users_schema_1.users.firstName,
                moderatorLastName: users_schema_1.users.lastName,
            })
                .from(moderation_schema_1.moderationActions)
                .leftJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(users_schema_1.users.username, moderation_schema_1.moderationActions.moderatorId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} >= ${range.start}`, (0, drizzle_orm_1.sql) `${moderation_schema_1.moderationActions.createdAt} <= ${range.end}`, ...(inScope
                ? [(0, drizzle_orm_1.inArray)(moderation_schema_1.moderationActions.channelId, scope.channelIds)]
                : [])))
                .orderBy((0, drizzle_orm_1.desc)(moderation_schema_1.moderationActions.createdAt))
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
                moderatorName: [r.moderatorFirstName, r.moderatorLastName]
                    .filter(Boolean)
                    .join(' ') || r.moderatorId,
                actionType: r.actionType,
                targetUserId: r.targetUserId,
                channelId: r.channelId,
                createdAt: r.createdAt.toISOString(),
            })),
        };
    }
    async responseTimeDetail(username, query) {
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
                ? round1(metrics.responseTime.totalSeconds / metrics.responseTime.samples)
                : null,
            samples: metrics.responseTime.samples,
            byChannel,
        };
    }
    serializeRange(range) {
        return {
            start: range.start.toISOString(),
            end: range.end.toISOString(),
            previousStart: range.previousStart.toISOString(),
            previousEnd: range.previousEnd.toISOString(),
            days: range.days,
        };
    }
    async userNameMap(usernames) {
        const map = new Map();
        if (usernames.length === 0)
            return map;
        const rows = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.inArray)(users_schema_1.users.username, usernames));
        for (const u of rows) {
            map.set(u.username, {
                name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
                imageUrl: u.imageUrl,
            });
        }
        return map;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        stream_service_1.StreamService,
        analytics_scope_service_1.AnalyticsScopeService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map