import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  aiActionDismissals,
  aiDetectedActions,
  AiDetectedAction,
} from '../database/schema/ai-actions.schema';
import { StreamService } from '../stream/stream.service';
import {
  ACTION_DETECTION_PROVIDER,
  ActionDetectionMessage,
  ActionDetectionProvider,
  AiDetectedIntent,
} from './action-detection.provider';
import { ResolveActionDto } from './dto/resolve-action.dto';

export interface DetectedActionItem {
  id: string;
  channelId: string;
  messageId: string;
  senderId: string | null;
  channelName: string | null;
  intentType: AiDetectedIntent;
  title: string;
  summary: string | null;
  confidence: number | null;
  sourceMessageText: string | null;
  meta: Record<string, unknown> | null;
  status: 'pending' | 'created';
  createdById: string | null;
  resolvedEntityType: string | null;
  resolvedEntityId: string | null;
  resolutionNote: string | null;
  dismissedByMe: boolean;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ChannelMeta {
  name: string | null;
  members: string[];
}

const BACKFILL_INITIAL_DELAY_MS = 20_000;
const BACKFILL_MESSAGES_LIMIT = 30;

@Injectable()
export class ActionDetectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActionDetectionService.name);
  private backfillTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly configService: ConfigService,
    @Inject(ACTION_DETECTION_PROVIDER)
    private readonly provider: ActionDetectionProvider,
  ) {}

  onModuleInit() {
    const intervalMs =
      this.configService.get<number>('actionDetection.backfillIntervalMs') ??
      900_000;

    this.backfillTimer = setInterval(() => {
      void this.runBackfill().catch((err) =>
        this.logger.error(
          `Action detection backfill failed: ${
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

  /**
   * Analyses a single message (or the newest message in the channel) and
   * persists any detected intents. Idempotent per (message, intent) thanks to
   * the unique index, so re-analysis never produces duplicate cards.
   */
  async analyze(
    channelId: string,
    userId: string,
    messageId?: string,
  ): Promise<DetectedActionItem[]> {
    const meta = await this.resolveChannel(channelId, userId);
    const target = await this.fetchTargetMessage(channelId, messageId);
    if (!target) return [];

    const result = await this.provider.detect({
      channelId,
      channelName: meta.name,
      message: target.message,
    });

    const items: AiDetectedAction[] = [];
    for (const suggestion of result.actions) {
      const stored = await this.storeOrGet(
        channelId,
        target.message,
        meta.name,
        suggestion,
      );
      if (stored) items.push(stored);
    }
    return items.map((a) => this.toItem(a, false));
  }

  /** Lists detectable actions for a channel, hiding the user's dismissals. */
  async list(channelId: string, userId: string): Promise<DetectedActionItem[]> {
    await this.resolveChannel(channelId, userId);

    const rows = await this.db
      .select()
      .from(aiDetectedActions)
      .where(
        and(
          eq(aiDetectedActions.channelId, channelId),
          sql`${aiDetectedActions.status} = 'pending'`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${aiActionDismissals}
            WHERE ${aiActionDismissals.actionId} = ${aiDetectedActions.id}
              AND ${aiActionDismissals.userId} = ${userId}
          )`,
        ),
      )
      .orderBy(sql`${aiDetectedActions.detectedAt} DESC`);

    return rows.map((r) => this.toItem(r, false));
  }

  async findOne(actionId: string, userId: string): Promise<DetectedActionItem> {
    const action = await this.getAction(actionId);
    await this.resolveChannel(action.channelId, userId);

    const [dismissal] = await this.db
      .select({ id: aiActionDismissals.id })
      .from(aiActionDismissals)
      .where(
        and(
          eq(aiActionDismissals.actionId, action.id),
          eq(aiActionDismissals.userId, userId),
        ),
      )
      .limit(1);

    return this.toItem(action, Boolean(dismissal));
  }

  async dismiss(actionId: string, userId: string): Promise<DetectedActionItem> {
    const action = await this.getAction(actionId);
    await this.resolveChannel(action.channelId, userId);

    await this.db
      .insert(aiActionDismissals)
      .values({ actionId: action.id, userId })
      .onConflictDoNothing();

    return this.toItem(action, true);
  }

  /**
   * Marks an action as acted upon. Resolution is bookkeeping only — the actual
   * permission enforcement happens when the entity is created (team_lead+) or
   * when a creation request is submitted (available to every member). Members
   * must still belong to the conversation to resolve.
   */
  async resolve(
    actionId: string,
    userId: string,
    dto: ResolveActionDto,
  ): Promise<DetectedActionItem> {
    const action = await this.getAction(actionId);
    await this.resolveChannel(action.channelId, userId);

    const entityType = dto.entityType ?? action.intentType;

    const [updated] = await this.db
      .update(aiDetectedActions)
      .set({
        status: 'created',
        createdById: userId,
        resolvedEntityType: entityType,
        resolvedEntityId: dto.entityId ?? null,
        resolutionNote: dto.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(aiDetectedActions.id, action.id))
      .returning();

    this.logger.log(
      `Action ${action.id} resolved as ${entityType} by ${userId}`,
    );
    return this.toItem(updated, false);
  }

  // --- Persistence helpers --------------------------------------------------

  private async storeOrGet(
    channelId: string,
    message: ActionDetectionMessage,
    channelName: string | null,
    suggestion: {
      intentType: AiDetectedIntent;
      title: string;
      summary: string;
      confidence: number;
      meta?: Record<string, unknown>;
    },
  ): Promise<AiDetectedAction | null> {
    const existing = await this.findByMessageAndIntent(
      message.id ?? '',
      suggestion.intentType,
    );
    if (existing) {
      return existing.status === 'pending' ? existing : null;
    }

    try {
      const [inserted] = await this.db
        .insert(aiDetectedActions)
        .values({
          channelId,
          messageId: message.id ?? '',
          senderId: message.userId,
          channelName,
          intentType: suggestion.intentType,
          title: suggestion.title,
          summary: suggestion.summary || null,
          confidence: String(suggestion.confidence),
          sourceMessageText: message.text || null,
          meta: suggestion.meta ?? {},
        })
        .returning();
      return inserted;
    } catch (err) {
      // Unique (message_id, intent_type) race: another request stored it first.
      const reason = (err as { code?: string })?.code;
      if (reason === '23505') {
        const existingAfter = await this.findByMessageAndIntent(
          message.id ?? '',
          suggestion.intentType,
        );
        return existingAfter && existingAfter.status === 'pending'
          ? existingAfter
          : null;
      }
      throw err;
    }
  }

  private async findByMessageAndIntent(
    messageId: string,
    intentType: AiDetectedIntent,
  ): Promise<AiDetectedAction | null> {
    if (!messageId) return null;
    const [row] = await this.db
      .select()
      .from(aiDetectedActions)
      .where(
        and(
          eq(aiDetectedActions.messageId, messageId),
          eq(aiDetectedActions.intentType, intentType),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async getAction(actionId: string): Promise<AiDetectedAction> {
    const [row] = await this.db
      .select()
      .from(aiDetectedActions)
      .where(eq(aiDetectedActions.id, actionId))
      .limit(1);
    if (!row) throw new NotFoundException(`Action ${actionId} not found`);
    return row;
  }

  // --- Channel & message helpers -------------------------------------------

  private async resolveChannel(
    channelId: string,
    userId: string,
  ): Promise<ChannelMeta> {
    const meta = await this.describeChannel(channelId);
    if (!meta.members.includes(userId)) {
      throw new ForbiddenException(
        'You are not a member of this conversation.',
      );
    }
    return meta;
  }

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

  private async fetchTargetMessage(
    channelId: string,
    messageId: string | undefined,
  ): Promise<{ message: ActionDetectionMessage } | null> {
    try {
      if (messageId) {
        const { message } = await this.client().getMessage(messageId);
        if (message.channel?.id && message.channel.id !== channelId) {
          throw new NotFoundException(
            'Message does not belong to the given channel',
          );
        }
        return { message: this.toDetectionMessage(message) };
      }

      const channel = this.client().channel('messaging', channelId);
      const { messages } = await channel.query({ messages: { limit: 1 } });
      const latest = messages.find((m) => !m.type || m.type === 'regular');
      if (!latest) return null;
      return { message: this.toDetectionMessage(latest) };
    } catch (err) {
      this.logger.warn(
        `Failed to fetch message for analysis in ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw new NotFoundException(
        `Message ${messageId ?? ''} not found`.trim(),
      );
    }
  }

  private toDetectionMessage(m: {
    id?: string;
    user?: { name?: string; id?: string } | null;
    text?: string;
    created_at?: string | null;
    type?: string;
  }): ActionDetectionMessage {
    return {
      id: m.id,
      user: m.user?.name ?? m.user?.id ?? 'Unknown',
      userId: m.user?.id ?? null,
      text: m.text ?? '',
      createdAt: m.created_at ?? null,
    };
  }

  // --- Background backfill --------------------------------------------------

  /** Analyses recent messages that have no stored detections yet. */
  private async runBackfill(): Promise<void> {
    let channelIds: string[];
    try {
      const channels = await this.client().queryChannels(
        { type: 'messaging' },
        { last_message_at: -1 },
        { limit: 100 },
      );
      channelIds = channels
        .map((channel) => channel.id)
        .filter((id): id is string => Boolean(id));
    } catch (err) {
      this.logger.warn(
        `Failed to list channels for action detection backfill: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return;
    }

    for (const channelId of channelIds) {
      try {
        await this.backfillChannel(channelId);
      } catch (err) {
        this.logger.warn(
          `Action detection backfill skipped channel ${channelId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  private async backfillChannel(channelId: string): Promise<void> {
    let channelMeta: ChannelMeta;
    let messages: Array<{
      id?: string;
      user?: { name?: string; id?: string } | null;
      text?: string;
      created_at?: string | null;
      type?: string;
    }>;

    try {
      const channel = this.client().channel('messaging', channelId);
      const { messages: msgs } = await channel.query({
        messages: { limit: BACKFILL_MESSAGES_LIMIT },
      });
      messages = msgs.filter((m) => !m.type || m.type === 'regular');
      channelMeta = await this.describeChannel(channelId);
    } catch (err) {
      this.logger.warn(
        `Backfill could not read channel ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return;
    }

    const candidates = messages.filter((m) => m.id && m.text?.trim());
    if (candidates.length === 0) return;

    const ids = candidates
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id));
    const existingRows = await this.db
      .select({ messageId: aiDetectedActions.messageId })
      .from(aiDetectedActions)
      .where(inArray(aiDetectedActions.messageId, ids));

    const stored = new Set(existingRows.map((r) => r.messageId));
    for (const message of candidates) {
      const messageId = message.id ?? '';
      if (stored.has(messageId)) continue;

      let result;
      try {
        result = await this.provider.detect({
          channelId,
          channelName: channelMeta.name,
          message: this.toDetectionMessage(message),
        });
      } catch (err) {
        this.logger.warn(
          `Action detection failed for message ${messageId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
        continue;
      }

      for (const suggestion of result.actions) {
        await this.storeOrGet(
          channelId,
          this.toDetectionMessage(message),
          channelMeta.name,
          suggestion,
        );
      }
    }
  }

  // --- Serialization --------------------------------------------------------

  private toItem(
    action: AiDetectedAction,
    dismissedByMe: boolean,
  ): DetectedActionItem {
    return {
      id: action.id,
      channelId: action.channelId,
      messageId: action.messageId,
      senderId: action.senderId ?? null,
      channelName: action.channelName ?? null,
      intentType: action.intentType,
      title: action.title,
      summary: action.summary ?? null,
      confidence: action.confidence ? Number(action.confidence) : null,
      sourceMessageText: action.sourceMessageText ?? null,
      meta: action.meta ?? null,
      status: action.status,
      createdById: action.createdById ?? null,
      resolvedEntityType: action.resolvedEntityType ?? null,
      resolvedEntityId: action.resolvedEntityId ?? null,
      resolutionNote: action.resolutionNote ?? null,
      dismissedByMe,
      detectedAt: action.detectedAt.toISOString(),
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    };
  }
}
