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
var SentimentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentService = exports.SENTIMENT_SETTING_KEY = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_provider_1 = require("../database/drizzle.provider");
const app_settings_schema_1 = require("../database/schema/app-settings.schema");
const stream_service_1 = require("../stream/stream.service");
const projects_service_1 = require("../projects/projects.service");
const project_access_service_1 = require("../projects/project-access.service");
const sentiment_provider_1 = require("./sentiment.provider");
const mock_sentiment_provider_1 = require("./providers/mock-sentiment.provider");
exports.SENTIMENT_SETTING_KEY = 'sentiment.enabled';
const MIN_MESSAGES_FOR_ANALYSIS = 5;
const MAX_FETCH_MESSAGES = 200;
let SentimentService = SentimentService_1 = class SentimentService {
    constructor(db, configService, streamService, projectsService, access, provider) {
        this.db = db;
        this.configService = configService;
        this.streamService = streamService;
        this.projectsService = projectsService;
        this.access = access;
        this.provider = provider;
        this.logger = new common_1.Logger(SentimentService_1.name);
    }
    async getEnabled() {
        const rows = await this.db
            .select()
            .from(app_settings_schema_1.appSettings)
            .where((0, drizzle_orm_1.eq)(app_settings_schema_1.appSettings.key, exports.SENTIMENT_SETTING_KEY))
            .limit(1);
        if (rows[0]) {
            return rows[0].value === true;
        }
        return this.configService.get('sentiment.enabled') ?? false;
    }
    async setEnabled(userId, enabled) {
        await this.db
            .insert(app_settings_schema_1.appSettings)
            .values({
            key: exports.SENTIMENT_SETTING_KEY,
            value: enabled,
            updatedBy: userId,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: app_settings_schema_1.appSettings.key,
            set: { value: enabled, updatedBy: userId, updatedAt: new Date() },
        });
        return enabled;
    }
    async analyzeProject(userId, projectId, days) {
        const enabled = await this.getEnabled();
        if (!enabled) {
            throw new common_1.ForbiddenException('Sentiment analysis is disabled for this workspace.');
        }
        await this.access.assertMember(projectId, userId);
        const project = await this.projectsService.requireProject(projectId);
        const windowEnd = new Date();
        const windowStart = new Date(windowEnd.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
        const messages = await this.fetchMessages(project.channelId, windowStart.toISOString());
        const nonEmpty = messages.filter((m) => (m.text ?? '').trim().length > 0);
        const base = {
            project: {
                id: project.id,
                name: project.name,
                channelId: project.channelId,
            },
            enabled: true,
        };
        if (nonEmpty.length < MIN_MESSAGES_FOR_ANALYSIS) {
            return {
                ...base,
                insufficient: true,
                analyzedCount: nonEmpty.length,
                provider: 'none',
                overall: null,
                positives: [],
                frustrations: [],
                blockers: [],
                trend: [],
            };
        }
        const context = {
            projectId: project.id,
            projectName: project.name,
            channelId: project.channelId ?? '',
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            messages: nonEmpty.map((m) => ({
                id: m.id ?? '',
                userId: m.user?.id ?? null,
                userName: m.user?.name ?? null,
                text: m.text ?? '',
                createdAt: m.created_at ?? null,
            })),
        };
        const result = await this.runAnalysis(context);
        const channelId = project.channelId ?? '';
        return {
            ...base,
            insufficient: false,
            analyzedCount: result.analyzedCount,
            provider: result.provider,
            overall: result.overall,
            positives: result.positives.map((i) => this.toInsight(i, channelId)),
            frustrations: result.frustrations.map((i) => this.toInsight(i, channelId)),
            blockers: result.blockers.map((i) => this.toInsight(i, channelId)),
            trend: result.trend,
        };
    }
    toInsight(insight, channelId) {
        return {
            ...insight,
            url: `/dashboard?channel=${encodeURIComponent(channelId)}&message=${encodeURIComponent(insight.messageId)}`,
        };
    }
    async runAnalysis(context) {
        try {
            return await this.provider.analyze(context);
        }
        catch (err) {
            this.logger.error(`AI sentiment analysis failed; using heuristic fallback: ${err instanceof Error ? err.message : String(err)}`);
            return new mock_sentiment_provider_1.MockSentimentProvider().analyze(context);
        }
    }
    async fetchMessages(channelId, windowStartIso) {
        if (!channelId)
            return [];
        try {
            const response = await this.streamService.getClient().search({ cid: { $eq: `messaging:${channelId}` } }, { created_at: { $gte: windowStartIso } }, { limit: MAX_FETCH_MESSAGES, sort: { created_at: -1 } });
            return response.results
                .map((r) => r.message)
                .filter((m) => Boolean(m?.id))
                .filter((m) => !m.type || m.type === 'regular')
                .filter((m) => !m.deleted_at);
        }
        catch (err) {
            this.logger.error(`Failed to fetch messages for channel ${channelId}: ${err instanceof Error ? err.message : String(err)}`);
            return [];
        }
    }
};
exports.SentimentService = SentimentService;
exports.SentimentService = SentimentService = SentimentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_provider_1.DRIZZLE)),
    __param(5, (0, common_1.Inject)(sentiment_provider_1.SENTIMENT_PROVIDER)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        config_1.ConfigService,
        stream_service_1.StreamService,
        projects_service_1.ProjectsService,
        project_access_service_1.ProjectAccessService, Object])
], SentimentService);
//# sourceMappingURL=sentiment.service.js.map