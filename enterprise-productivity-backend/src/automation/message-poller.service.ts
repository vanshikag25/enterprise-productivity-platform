import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { automationWorkflows } from '../database/schema/workflows.schema';
import { StreamService } from '../stream/stream.service';
import { WorkflowEventBus } from './event-bus/event-bus.service';
import { toDisplayString } from './string-utils';

const MESSAGE_POLL_INITIAL_DELAY_MS = 15_000;

/**
 * Polls Stream Chat for new messages to power the message_received and
 * mention_received triggers. Stream delivers chat to clients directly, so the
 * backend cannot hook sends synchronously; a lightweight poller with an
 * in-memory per-channel cursor covers it. Dedup (unique workflowId+eventKey)
 * makes occasional overlaps harmless.
 */
@Injectable()
export class MessagePollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagePollerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly cursors = new Map<string, string>();
  private seeded = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly configService: ConfigService,
    private readonly streamService: StreamService,
    private readonly eventBus: WorkflowEventBus,
  ) {}

  onModuleInit() {
    const intervalMs =
      this.configService.get<number>('automation.messagePollIntervalMs') ??
      30_000;
    this.timer = setInterval(() => {
      void this.poll().catch((err) =>
        this.logger.error(
          `Message poll failed: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }, intervalMs);

    setTimeout(
      () => void this.poll().catch(() => undefined),
      MESSAGE_POLL_INITIAL_DELAY_MS,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    const workflows = await this.db
      .select()
      .from(automationWorkflows)
      .where(
        and(
          eq(automationWorkflows.enabled, true),
          inArray(automationWorkflows.triggerType, [
            'message_received',
            'mention_received',
          ]),
        ),
      );
    if (workflows.length === 0) return;

    const channelIds = new Set<string>();
    const mentionUsers = new Set<string>();
    let watchAll = false;

    for (const workflow of workflows) {
      const config = workflow.triggerConfig ?? {};
      if (config.channelId) {
        channelIds.add(toDisplayString(config.channelId));
      } else {
        watchAll = true;
      }
      if (config.mentionUser)
        mentionUsers.add(toDisplayString(config.mentionUser));
    }

    let channels: string[];
    if (watchAll) {
      channels = await this.allChannelIds();
    } else {
      channels = Array.from(channelIds);
    }

    for (const channelId of channels) {
      try {
        await this.pollChannel(channelId, mentionUsers);
      } catch (err) {
        this.logger.warn(
          `Message poll skipped channel ${channelId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }

  private async allChannelIds(): Promise<string[]> {
    try {
      const channels = await this.streamService
        .getClient()
        .queryChannels(
          { type: 'messaging' },
          { last_message_at: -1 },
          { limit: 200 },
        );
      return channels
        .map((channel) => channel.id)
        .filter((id): id is string => Boolean(id));
    } catch (err) {
      this.logger.warn(`Failed to list channels for message polling: ${err}`);
      return [];
    }
  }

  private async pollChannel(
    channelId: string,
    mentionUsers: Set<string>,
  ): Promise<void> {
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
    const { messages } = await channel.query({ messages: { limit: 50 } });
    const regular = messages
      .filter((m) => !m.type || m.type === 'regular')
      .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

    const cursor = this.cursors.get(channelId);
    if (!cursor && !this.seeded) {
      const last = regular[regular.length - 1];
      if (last?.id) this.cursors.set(channelId, last.id);
      return;
    }

    this.seeded = true;
    const startIdx = cursor
      ? (() => {
          const idx = regular.findIndex((m) => m.id === cursor);
          return idx === -1 ? 0 : idx + 1;
        })()
      : 0;

    for (const message of regular.slice(startIdx)) {
      if (!message.id) continue;
      const text = message.text ?? '';
      const actor = message.user?.id ?? 'unknown';
      const payload: Record<string, unknown> = {
        messageId: message.id,
        messageText: text,
        channelId,
        actor,
        title: '',
      };

      this.eventBus.emit('message_received', `message:${message.id}`, payload);

      if (mentionUsers.size > 0) {
        const mentioned = Array.from(mentionUsers).find(
          (user) =>
            user && text.toLowerCase().includes(`@${user.toLowerCase()}`),
        );
        if (mentioned) {
          this.eventBus.emit('mention_received', `message:${message.id}`, {
            ...payload,
            mentionUser: mentioned,
          });
        }
      }

      this.cursors.set(channelId, message.id);
    }
  }
}
