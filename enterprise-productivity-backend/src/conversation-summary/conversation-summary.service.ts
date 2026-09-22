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

interface ChannelBackfillCandidate {
  id: string;
  lastMessageAt: Date | null;
}

const MESSAGES_LIMIT = 500;
const BACKFILL_INITIAL_DELAY_MS = 15_000;

// Retry tuning for transient 429s from the AI provider.
const PROVIDER_MAX_RETRIES = 4;
const PROVIDER_RETRY_BASE_MS = 2_000;

// --- Free-tier Gemini quota guardrails -------------------------------------
// Your project's actual limits (check https://aistudio.google.com/rate-limit
// for the model you're using — these are NOT universal and change over time).
// Defaults below are deliberately conservative; override via config:
//   summaries.geminiRpm, summaries.geminiRpd
const DEFAULT_GEMINI_RPM = 5;
const DEFAULT_GEMINI_RPD = 20;
// Leave a safety margin below the hard cap so other callers (on-demand
// `generate()` calls from users) still have headroom during the day.
const RPD_SAFETY_MARGIN = 0.8;

@Injectable()
export class ConversationSummaryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConversationSummaryService.name);
  private backfillTimer: ReturnType<typeof setInterval> | null = null;
  private backfillRunning = false;

  // Rolling daily request counter for the AI provider, reset at midnight
  // Pacific (matches Gemini's RPD reset per Google's docs). This is
  // process-local; if you run multiple instances, either coordinate this
  // through a shared store (e.g. Redis) or divide the budget across instances.
  private dailyRequestCount = 0;
  private dailyResetAt = this.nextPacificMidnight();

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

    await this.consumeProviderBudget();

    const result = await this.withProviderRetry(() =>
      this.provider.generate({
        channelId,
        channelName: meta.name,
        memberCount: meta.memberCount,
        periodType,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        messages,
      }),
    );

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
    if (this.backfillRunning) {
      this.logger.warn(
        'Summary backfill still running from a previous cycle, skipping this tick',
      );
      return;
    }

    this.backfillRunning = true;
    try {
      const channels = await this.listChannelsForBackfill();
      const today = this.startOfUtcDay(new Date());
      const weekStart = this.startOfUtcWeek(new Date());
      const dailyStart = this.addDays(today, -1);
      const weeklyStart = this.addDays(weekStart, -7);

      let budgetExhausted = false;
      let skippedInactive = 0;

      for (let i = 0; i < channels.length; i++) {
        if (budgetExhausted) break;
        const { id: channelId, lastMessageAt } = channels[i];

        // No messages since the period even started — nothing to
        // summarize, so don't spend quota on it. `lastMessageAt` is null
        // for channels with no messages at all (never active).
        const hasDailyActivity =
          !!lastMessageAt && lastMessageAt.getTime() >= dailyStart.getTime();
        const hasWeeklyActivity =
          !!lastMessageAt && lastMessageAt.getTime() >= weeklyStart.getTime();

        if (!hasDailyActivity && !hasWeeklyActivity) {
          skippedInactive++;
          continue;
        }

        try {
          const meta = await this.describeChannel(channelId);

          if (hasDailyActivity) {
            await this.ensurePeriod(channelId, 'daily', dailyStart, today, meta);
          }

          if (hasWeeklyActivity) {
            await this.ensurePeriod(
              channelId,
              'weekly',
              weeklyStart,
              weekStart,
              meta,
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);

          if (message.includes('daily budget exhausted')) {
            budgetExhausted = true;
            const remaining = channels.length - i;
            this.logger.warn(
              `Summary backfill halted: ${message} — ${remaining} channel(s) left unprocessed this cycle.`,
            );
            break;
          }

          this.logger.warn(
            `Summary backfill skipped channel ${channelId}: ${message}`,
          );
        }
      }

      if (skippedInactive > 0) {
        this.logger.log(
          `Summary backfill skipped ${skippedInactive} inactive channel(s) with no new messages this cycle.`,
        );
      }
    } finally {
      this.backfillRunning = false;
    }
  }

  /** Returns true if a summary was actually generated (i.e. an AI call was made). */
  private async ensurePeriod(
    channelId: string,
    periodType: SummaryPeriodType,
    start: Date,
    end: Date,
    meta: ChannelMeta,
  ): Promise<boolean> {
    const existing = await this.findByPeriod(channelId, periodType, start);
    if (existing) return false;
    await this.buildAndStore(channelId, periodType, start, end, meta);
    return true;
  }

  private async listChannelsForBackfill(): Promise<ChannelBackfillCandidate[]> {
    try {
      const channels = await this.client().queryChannels(
        { type: 'messaging' },
        { last_message_at: -1 },
        { limit: 200 },
      );
      return channels
        .filter((channel) => Boolean(channel.id))
        .map((channel) => {
          const lastMessageAt = (
            channel.data as { last_message_at?: string } | undefined
          )?.last_message_at;
          return {
            id: channel.id as string,
            lastMessageAt: lastMessageAt ? new Date(lastMessageAt) : null,
          };
        });
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

  // --- Rate limiting / retry helpers ----------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private nextPacificMidnight(): number {
    // Gemini's RPD resets at midnight Pacific. We approximate Pacific time
    // via the `America/Los_Angeles` IANA zone so DST is handled correctly.
    const now = new Date();
    const pacificNow = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    );
    const nextMidnightPacific = new Date(
      pacificNow.getFullYear(),
      pacificNow.getMonth(),
      pacificNow.getDate() + 1,
    );
    const offsetMs = now.getTime() - pacificNow.getTime();
    return nextMidnightPacific.getTime() + offsetMs;
  }

  private get geminiRpm(): number {
    return (
      this.configService.get<number>('summaries.geminiRpm') ??
      DEFAULT_GEMINI_RPM
    );
  }

  private get geminiRpd(): number {
    return (
      this.configService.get<number>('summaries.geminiRpd') ??
      DEFAULT_GEMINI_RPD
    );
  }

  private lastProviderCallAt = 0;

  /**
   * Enforces both RPM pacing and a daily request budget before letting a
   * provider call through. Throws if the daily budget is exhausted so
   * callers (backfill loop, on-demand `generate()`) can react distinctly
   * rather than hammering an already-exhausted quota.
   */
  private async consumeProviderBudget(): Promise<void> {
    const now = Date.now();
    if (now >= this.dailyResetAt) {
      this.dailyRequestCount = 0;
      this.dailyResetAt = this.nextPacificMidnight();
    }

    const budget = Math.max(1, Math.floor(this.geminiRpd * RPD_SAFETY_MARGIN));
    if (this.dailyRequestCount >= budget) {
      throw new Error(
        `AI provider daily budget exhausted (${this.dailyRequestCount}/${budget} of ${this.geminiRpd} RPD, ${Math.round(
          RPD_SAFETY_MARGIN * 100,
        )}% safety margin). Resets at ${new Date(
          this.dailyResetAt,
        ).toISOString()}.`,
      );
    }

    const minIntervalMs = Math.ceil(60_000 / Math.max(1, this.geminiRpm));
    const wait = Math.max(0, minIntervalMs - (now - this.lastProviderCallAt));
    if (wait > 0) await this.sleep(wait);

    this.lastProviderCallAt = Date.now();
    this.dailyRequestCount++;
  }

  /**
   * Wraps a provider call with exponential backoff + jitter on 429s.
   * Parses the status code out of the provider's error message
   * (format: "AI provider request failed (429): ...").
   */
  private async withProviderRetry<T>(
    fn: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const statusMatch = /\((\d{3})\)/.exec(message);
      const status = statusMatch ? Number(statusMatch[1]) : undefined;

      if (status === 429 && attempt < PROVIDER_MAX_RETRIES) {
        const delay =
          PROVIDER_RETRY_BASE_MS * 2 ** attempt + Math.random() * 500;
        this.logger.warn(
          `Provider rate-limited (429), retrying in ${Math.round(
            delay,
          )}ms (attempt ${attempt + 1}/${PROVIDER_MAX_RETRIES})`,
        );
        await this.sleep(delay);
        return this.withProviderRetry(fn, attempt + 1);
      }

      throw err;
    }
  }
}
