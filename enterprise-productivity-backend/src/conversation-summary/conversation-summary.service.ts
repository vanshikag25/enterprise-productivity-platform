import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  conversationSummaries,
  ConversationSummary,
} from '../database/schema/conversation-summaries.schema';
import { StreamService } from '../stream/stream.service';
import {
  CONVERSATION_SUMMARY_PROVIDER,
  ConversationSummaryMessage,
  ConversationSummaryProvider,
  SummaryPeriodType,
} from './conversation-summary.provider';
import { GenerateConversationSummaryDto } from './dto/generate-conversation-summary.dto';

interface ChannelMeta {
  name: string | null;
  memberCount: number;
  members: string[];
}

const MESSAGES_LIMIT = 500;
const BACKFILL_INITIAL_DELAY_MS = 15_000;

@Injectable()
export class ConversationSummaryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConversationSummaryService.name);
  private backfillTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly configService: ConfigService,
    @Inject(CONVERSATION_SUMMARY_PROVIDER)
    private readonly provider: ConversationSummaryProvider,
  ) {}

  onModuleInit() {
    const intervalMs =
      this.configService.get<number>('summaries.backfillIntervalMs') ??
      3_600_000;

    // Best-effort backfill so daily/weekly summaries exist for conversations
    // even if nobody opened the summary panel. Missing periods are generated
    // once (the unique (channel, type, period start) index makes it idempotent).
    this.backfillTimer = setInterval(() => {
      void this.runBackfill().catch((err) =>
        this.logger.error(
          `Conversation summary backfill failed: ${
            err instanceof Error ? err.message : err
          }`,
        ),
      );
    }, intervalMs);

    setTimeout(
      () => void this.runBackfill().catch(() => undefined),
      BACKFILL_INITIAL_DELAY_MS,
    );
  }

  onModuleDestroy() {
    if (this.backfillTimer) clearInterval(this.backfillTimer);
  }

  private client() {
    return this.streamService.getClient();
  }

  // --- Public API ----------------------------------------------------------

  async listSummaries(channelId: string, userId: string) {
    await this.assertChannelMember(channelId, userId);
    return this.db
      .select()
      .from(conversationSummaries)
      .where(eq(conversationSummaries.channelId, channelId))
      .orderBy(desc(conversationSummaries.generatedAt))
      .limit(100);
  }

  /**
   * Returns the summary for the current daily/weekly period, generating it
   * lazily on first access. Idempotent per period.
   */
  async getCurrent(
    channelId: string,
    userId: string,
    periodType: 'daily' | 'weekly',
  ): Promise<ConversationSummary> {
    await this.assertChannelMember(channelId, userId);
    const { start, end } = this.currentPeriod(periodType);
    const existing = await this.findByPeriod(channelId, periodType, start);
    if (existing) return existing;
    return this.buildAndStore(
      channelId,
      periodType,
      start,
      end,
      await this.describeChannel(channelId),
    );
  }

  /** Regenerates (and stores) a summary on demand. */
  async generate(
    channelId: string,
    userId: string,
    dto: GenerateConversationSummaryDto,
  ): Promise<ConversationSummary> {
    const meta = await this.resolveChannel(channelId, userId);

    if (dto.periodType === 'manual') {
      if (dto.start && dto.end) {
        const start = new Date(dto.start);
        const end = new Date(dto.end);
        if (start.getTime() >= end.getTime()) {
          throw new NotFoundException('start must be before end');
        }
        return this.buildAndStore(channelId, 'manual', start, end, meta);
      }
      return this.generateManual(channelId, meta);
    }

    const { start, end } = this.currentPeriod(dto.periodType);
    return this.buildAndStore(channelId, dto.periodType, start, end, meta);
  }

  // --- Generation ----------------------------------------------------------

  /**
   * Manual summary covering the recent conversation history. periodStart is
   * pinned to the earliest message so repeated clicks overwrite the same row.
   */
  private async generateManual(
    channelId: string,
    meta: ChannelMeta,
  ): Promise<ConversationSummary> {
    const messages = await this.fetchRecentMessages(channelId);
    const end = new Date();
    const earliest = messages[messages.length - 1];
    const start = earliest?.createdAt ? new Date(earliest.createdAt) : end;
    return this.buildAndStore(channelId, 'manual', start, end, meta, messages);
  }

  private async buildAndStore(
    channelId: string,
    periodType: SummaryPeriodType,
    start: Date,
    end: Date,
    meta: ChannelMeta,
    messagesOverride?: ConversationSummaryMessage[],
  ): Promise<ConversationSummary> {
    const messages =
      messagesOverride ??
      (await this.fetchMessagesInPeriod(channelId, start, end));

    const result = await this.provider.generate({
      channelId,
      channelName: meta.name,
      memberCount: meta.memberCount,
      periodType,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      messages,
    });

    const generatedAt = new Date(result.generatedAt);
    const [row] = await this.db
      .insert(conversationSummaries)
      .values({
        channelId,
        periodType,
        periodStart: start,
        periodEnd: end,
        overview: result.overview,
        keyDecisions: result.keyDecisions,
        actionItems: result.actionItems,
        unresolvedTopics: result.unresolvedTopics,
        messageCount: messages.length,
        provider: result.provider,
        generatedAt,
        updatedAt: generatedAt,
      })
      .onConflictDoUpdate({
        target: [
          conversationSummaries.channelId,
          conversationSummaries.periodType,
          conversationSummaries.periodStart,
        ],
        set: {
          periodEnd: end,
          overview: result.overview,
          keyDecisions: result.keyDecisions,
          actionItems: result.actionItems,
          unresolvedTopics: result.unresolvedTopics,
          messageCount: messages.length,
          provider: result.provider,
          generatedAt,
          updatedAt: generatedAt,
        },
      })
      .returning();

    this.logger.log(
      `Stored ${periodType} summary for channel ${channelId} (${messages.length} messages, ${result.provider})`,
    );
    return row;
  }

  private async findByPeriod(
    channelId: string,
    periodType: SummaryPeriodType,
    start: Date,
  ): Promise<ConversationSummary | null> {
    const [row] = await this.db
      .select()
      .from(conversationSummaries)
      .where(
        and(
          eq(conversationSummaries.channelId, channelId),
          eq(conversationSummaries.periodType, periodType),
          eq(conversationSummaries.periodStart, start),
        ),
      );
    return row ?? null;
  }

  // --- Background backfill -------------------------------------------------

  private async runBackfill(): Promise<void> {
    const channelIds = await this.allChannelIds();
    const today = this.startOfUtcDay(new Date());
    const weekStart = this.startOfUtcWeek(new Date());

    for (const channelId of channelIds) {
      try {
        const meta = await this.describeChannel(channelId);
        await this.ensurePeriod(
          channelId,
          'daily',
          this.addDays(today, -1),
          today,
          meta,
        );
        await this.ensurePeriod(
          channelId,
          'weekly',
          this.addDays(weekStart, -7),
          weekStart,
          meta,
        );
      } catch (err) {
        this.logger.warn(
          `Summary backfill skipped channel ${channelId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  private async ensurePeriod(
    channelId: string,
    periodType: SummaryPeriodType,
    start: Date,
    end: Date,
    meta: ChannelMeta,
  ): Promise<void> {
    const existing = await this.findByPeriod(channelId, periodType, start);
    if (existing) return;
    await this.buildAndStore(channelId, periodType, start, end, meta);
  }

  private async allChannelIds(): Promise<string[]> {
    try {
      const channels = await this.client().queryChannels(
        { type: 'messaging' },
        { last_message_at: -1 },
        { limit: 200 },
      );
      return channels
        .map((channel) => channel.id)
        .filter((id): id is string => Boolean(id));
    } catch (err) {
      this.logger.warn(
        `Failed to list channels for summary backfill: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return [];
    }
  }

  // --- Channel helpers -----------------------------------------------------

  private async describeChannel(channelId: string): Promise<ChannelMeta> {
    const channel = this.client().channel('messaging', channelId);
    try {
      const response = await channel.query({
        members: { limit: 100 },
        messages: { limit: 1 },
      });
      const members = response.members
        .map((member) => member.user_id)
        .filter((id): id is string => Boolean(id));
      return {
        name:
          (response.channel as { name?: string } | null | undefined)?.name ??
          null,
        memberCount: members.length,
        members,
      };
    } catch (err) {
      this.logger.warn(
        `Failed to describe channel ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw new NotFoundException(`Conversation ${channelId} not found`);
    }
  }

  private async resolveChannel(
    channelId: string,
    userId: string,
  ): Promise<ChannelMeta> {
    const meta = await this.describeChannel(channelId);
    if (!meta.members.includes(userId)) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
    return meta;
  }

  private async assertChannelMember(
    channelId: string,
    userId: string,
  ): Promise<void> {
    await this.resolveChannel(channelId, userId);
  }

  // --- Message fetching ----------------------------------------------------

  private async fetchMessagesInPeriod(
    channelId: string,
    start: Date,
    end: Date,
  ): Promise<ConversationSummaryMessage[]> {
    try {
      const response = await this.client().search(
        { cid: { $eq: `messaging:${channelId}` } },
        {
          created_at: { $gte: start.toISOString() },
        },
        { limit: MESSAGES_LIMIT, sort: { created_at: -1 } },
      );
      return response.results
        .map(({ message }) => message)
        .filter((m) => !m.type || m.type === 'regular')
        .map((m) => this.toMessage(m))
        .filter((m) => {
          if (!m.createdAt) return false;
          const time = new Date(m.createdAt).getTime();
          return time >= start.getTime() && time < end.getTime();
        });
    } catch (err) {
      this.logger.warn(
        `Message search failed for channel ${channelId}, falling back to recent messages: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return this.fetchRecentMessages(channelId, start, end);
    }
  }

  private async fetchRecentMessages(
    channelId: string,
    start?: Date,
    end?: Date,
  ): Promise<ConversationSummaryMessage[]> {
    const channel = this.client().channel('messaging', channelId);
    const { messages } = await channel.query({ messages: { limit: 200 } });
    return messages
      .filter((m) => !m.type || m.type === 'regular')
      .filter((m) => {
        if (!m.created_at) return false;
        const time = new Date(m.created_at).getTime();
        if (start && time < start.getTime()) return false;
        if (end && time >= end.getTime()) return false;
        return true;
      })
      .map((m) => this.toMessage(m));
  }

  private toMessage(m: {
    user?: { name?: string; id?: string } | null;
    text?: string;
    created_at?: string | null;
    type?: string;
  }): ConversationSummaryMessage {
    return {
      user: m.user?.name ?? m.user?.id ?? 'Unknown',
      text: m.text ?? '',
      createdAt: m.created_at ?? null,
    };
  }

  // --- Period math (UTC, so day/week boundaries are deterministic) ---------

  private currentPeriod(periodType: 'daily' | 'weekly'): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    if (periodType === 'daily') {
      return { start: this.startOfUtcDay(now), end: now };
    }
    return { start: this.startOfUtcWeek(now), end: now };
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  /** Monday 00:00 UTC of the week containing `date`. */
  private startOfUtcWeek(date: Date): Date {
    const day = this.startOfUtcDay(date);
    const daysSinceMonday = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - daysSinceMonday);
    return day;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86_400_000);
  }
}
