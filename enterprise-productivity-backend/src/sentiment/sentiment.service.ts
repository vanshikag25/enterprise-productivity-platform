import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { MessageResponse } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import { appSettings } from '../database/schema/app-settings.schema';
import { StreamService } from '../stream/stream.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectAccessService } from '../projects/project-access.service';
import {
  SENTIMENT_PROVIDER,
  SentimentContext,
  SentimentProvider,
  SentimentResult,
} from './sentiment.provider';
import { MockSentimentProvider } from './providers/mock-sentiment.provider';

export const SENTIMENT_SETTING_KEY = 'sentiment.enabled';
const MIN_MESSAGES_FOR_ANALYSIS = 5;
const MAX_FETCH_MESSAGES = 200;

export interface SentimentInsight {
  messageId: string;
  userId: string | null;
  userName: string | null;
  text: string;
  createdAt: string | null;
  category: 'positive' | 'frustration' | 'blocker' | 'neutral';
  confidence: number;
  /** Deep link into the original conversation. */
  url: string;
}

export interface SentimentAnalysisResponse {
  project: { id: string; name: string; channelId: string | null };
  enabled: boolean;
  insufficient: boolean;
  analyzedCount: number;
  provider: string;
  overall: { label: string; score: number } | null;
  positives: SentimentInsight[];
  frustrations: SentimentInsight[];
  blockers: SentimentInsight[];
  trend: { date: string; positive: number; frustration: number; neutral: number }[];
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly streamService: StreamService,
    private readonly projectsService: ProjectsService,
    private readonly access: ProjectAccessService,
    @Inject(SENTIMENT_PROVIDER) private readonly provider: SentimentProvider,
  ) {}

  async getEnabled(): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SENTIMENT_SETTING_KEY))
      .limit(1);
    if (rows[0]) {
      return rows[0].value === true;
    }
    return this.configService.get<boolean>('sentiment.enabled') ?? false;
  }

  async setEnabled(userId: string, enabled: boolean): Promise<boolean> {
    await this.db
      .insert(appSettings)
      .values({
        key: SENTIMENT_SETTING_KEY,
        value: enabled,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: enabled, updatedBy: userId, updatedAt: new Date() },
      });
    return enabled;
  }

  /**
   * Analyzes the chat channel of a project the user is a member of. RBAC is
   * enforced with ProjectAccessService.assertMember, and the channel analyzed
   * is always the project's own team channel, so private 1:1 messages are
   * never in scope.
   */
  async analyzeProject(
    userId: string,
    projectId: string,
    days: number,
  ): Promise<SentimentAnalysisResponse> {
    const enabled = await this.getEnabled();
    if (!enabled) {
      throw new ForbiddenException(
        'Sentiment analysis is disabled for this workspace.',
      );
    }

    await this.access.assertMember(projectId, userId);
    const project = await this.projectsService.requireProject(projectId);

    const windowEnd = new Date();
    const windowStart = new Date(
      windowEnd.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000,
    );

    const messages = await this.fetchMessages(
      project.channelId,
      windowStart.toISOString(),
    );
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

    const context: SentimentContext = {
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

  private toInsight(
    insight: SentimentResult['positives'][number],
    channelId: string,
  ): SentimentInsight {
    return {
      ...insight,
      url: `/dashboard?channel=${encodeURIComponent(channelId)}&message=${encodeURIComponent(insight.messageId)}`,
    };
  }

  private async runAnalysis(context: SentimentContext): Promise<SentimentResult> {
    try {
      return await this.provider.analyze(context);
    } catch (err) {
      this.logger.error(
        `AI sentiment analysis failed; using heuristic fallback: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return new MockSentimentProvider().analyze(context);
    }
  }

  private async fetchMessages(
    channelId: string | null,
    windowStartIso: string,
  ): Promise<MessageResponse[]> {
    if (!channelId) return [];
    try {
      const response = await this.streamService.getClient().search(
        { cid: { $eq: `messaging:${channelId}` } },
        { created_at: { $gte: windowStartIso } },
        { limit: MAX_FETCH_MESSAGES, sort: { created_at: -1 } },
      );
      return response.results
        .map((r) => r.message)
        .filter((m): m is MessageResponse => Boolean(m?.id))
        .filter((m) => !m.type || m.type === 'regular')
        .filter((m) => !m.deleted_at);
    } catch (err) {
      this.logger.error(
        `Failed to fetch messages for channel ${channelId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }
  }
}