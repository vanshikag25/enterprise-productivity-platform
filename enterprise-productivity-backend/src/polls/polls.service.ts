import {
  Inject,
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PollData } from 'stream-chat';
import { VotingVisibility } from 'stream-chat';
import { DRIZZLE } from '../database/drizzle.provider';
import { polls, Poll } from '../database/schema/polls.schema';
import { StreamService } from '../stream/stream.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { hasMinRole } from '../rbac/roles';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';

const AUTO_CLOSE_INTERVAL_MS = 60_000;
const AUTO_CLOSE_INITIAL_DELAY_MS = 5_000;

/**
 * Poll questions, options and votes are stored by Stream Chat. This service
 * owns the parts Stream does not provide: deadline-based auto-close, poll
 * lifecycle notifications (created / closed / winner) and management guards.
 */
@Injectable()
export class PollsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PollsService.name);
  private autoCloseTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    // Auto-close polls whose deadline passed. Runs while the app is up; a poll
    // is also finalized lazily on read via autoCloseExpired().
    this.autoCloseTimer = setInterval(() => {
      void this.autoCloseExpired().catch((err) =>
        this.logger.error(
          `Failed to auto-close expired polls: ${
            err instanceof Error ? err.message : err
          }`,
        ),
      );
    }, AUTO_CLOSE_INTERVAL_MS);
    setTimeout(
      () => void this.autoCloseExpired().catch(() => undefined),
      AUTO_CLOSE_INITIAL_DELAY_MS,
    );
  }

  onModuleDestroy() {
    if (this.autoCloseTimer) clearInterval(this.autoCloseTimer);
  }

  private client() {
    return this.streamService.getClient();
  }

  private pollActionUrl(channelId: string, messageId: string): string {
    return `/dashboard?channel=${encodeURIComponent(
      channelId,
    )}&message=${encodeURIComponent(messageId)}`;
  }

  private async channelMemberIds(channelId: string): Promise<string[]> {
    try {
      const { members } = await this.client()
        .channel('messaging', channelId)
        .queryMembers({}, {}, { limit: 100 });
      return members
        .map((member) => member.user_id)
        .filter((id): id is string => Boolean(id));
    } catch (err) {
      this.logger.warn(
        `Failed to query members for channel ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return [];
    }
  }

  private async notifyMembers(
    channelId: string,
    excludeUserId: string,
    input: Omit<Parameters<NotificationsService['create']>[0], 'userId'>,
  ): Promise<void> {
    const memberIds = (await this.channelMemberIds(channelId)).filter(
      (id) => id !== excludeUserId,
    );
    if (memberIds.length === 0) return;
    await this.notificationsService.createMany(
      memberIds.map((userId) => ({ ...input, userId })),
    );
  }

  private async findOneByStreamPollId(streamPollId: string): Promise<Poll> {
    const [poll] = await this.db
      .select()
      .from(polls)
      .where(eq(polls.streamPollId, streamPollId));
    if (!poll) throw new NotFoundException(`Poll ${streamPollId} not found`);
    return poll;
  }

  private async assertCanManage(poll: Poll, userId: string): Promise<void> {
    if (poll.createdBy === userId) return;
    const user = await this.usersService.findByUsername(userId);
    if (user && hasMinRole(user.role, 'manager')) return;
    throw new ForbiddenException(
      'Only the poll creator, Manager, or a higher role can manage this poll',
    );
  }

  private async computeWinner(streamPollId: string): Promise<string[]> {
    try {
      const { poll } = await this.client().getPoll(streamPollId);
      const maxVotes = Math.max(
        0,
        ...poll.options.map((option) => option.vote_count ?? 0),
      );
      if (maxVotes === 0) return [];
      return poll.options
        .filter((option) => (option.vote_count ?? 0) === maxVotes)
        .map((option) => option.text);
    } catch (err) {
      this.logger.warn(
        `Failed to compute winner for poll ${streamPollId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return [];
    }
  }

  async create(
    userId: string,
    dto: CreatePollDto,
  ): Promise<{ streamPollId: string; messageId: string }> {
    const question = dto.question.trim();
    const options = Array.from(
      new Set(dto.options.map((option) => option.trim()).filter(Boolean)),
    );
    if (options.length < 2)
      throw new BadRequestException('Polls need at least two options');

    const multipleAnswers = Boolean(dto.multipleAnswers);

    const created = await this.client().createPoll({
      name: question,
      options: options.map((text, position) => ({ text, position })),
      voting_visibility: dto.anonymous
        ? VotingVisibility.anonymous
        : VotingVisibility.public,
      enforce_unique_vote: !multipleAnswers,
      max_votes_allowed: multipleAnswers ? options.length : 1,
      allow_answers: false,
      allow_user_suggested_options: false,
      user_id: userId,
    });
    const streamPollId = created.poll.id;

    const message = await this.client()
      .channel('messaging', dto.channelId)
      .sendMessage({
        text: question,
        user_id: userId,
        poll_id: streamPollId,
      });
    const messageId = message.message.id;

    await this.db
      .insert(polls)
      .values({
        streamPollId,
        channelId: dto.channelId,
        messageId,
        question,
        createdBy: userId,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      })
      .execute();

    await this.notifyMembers(dto.channelId, userId, {
      type: 'poll_created',
      title: 'New poll',
      description: question,
      actionUrl: this.pollActionUrl(dto.channelId, messageId),
    });

    this.logger.log(
      `Poll ${streamPollId} created in channel ${dto.channelId} by ${userId}`,
    );
    return { streamPollId, messageId };
  }

  async findForChannel(channelId: string): Promise<Poll[]> {
    // Lazily close any polls whose deadline passed while the app was offline.
    await this.autoCloseExpired();
    return this.db
      .select()
      .from(polls)
      .where(eq(polls.channelId, channelId))
      .orderBy(polls.createdAt);
  }

  async resolve(streamPollId: string): Promise<Poll> {
    return this.findOneByStreamPollId(streamPollId);
  }

  async update(
    streamPollId: string,
    userId: string,
    dto: UpdatePollDto,
  ): Promise<Poll> {
    if (dto.question === undefined && dto.options === undefined)
      throw new BadRequestException('Nothing to update');

    const poll = await this.findOneByStreamPollId(streamPollId);
    if (poll.createdBy !== userId)
      throw new ForbiddenException('Only the poll creator can edit this poll');
    if (poll.closedAt)
      throw new BadRequestException('This poll is already closed');

    const current = await this.client().getPoll(streamPollId);
    if (current.poll.is_closed)
      throw new BadRequestException('This poll is already closed');
    const totalVotes = current.poll.options.reduce(
      (sum, option) => sum + (option.vote_count ?? 0),
      0,
    );
    if (totalVotes > 0)
      throw new BadRequestException(
        'A poll can only be edited before anyone has voted',
      );

    const question = dto.question?.trim() ?? poll.question;
    const options = dto.options
      ? Array.from(
          new Set(dto.options.map((option) => option.trim()).filter(Boolean)),
        )
      : undefined;
    if (options && options.length < 2)
      throw new BadRequestException('Polls need at least two options');

    const set: Partial<PollData> = {};
    if (question !== poll.question) set.name = question;
    if (options)
      set.options = options.map((text, position) => ({ text, position }));

    if (Object.keys(set).length > 0) {
      await this.client().partialUpdatePoll(streamPollId, { set }, userId);
    }

    if (set.name) {
      try {
        await this.client().updateMessage({
          id: poll.messageId,
          text: question,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to update poll message text: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    const [updated] = await this.db
      .update(polls)
      .set({ question, updatedAt: new Date() })
      .where(eq(polls.id, poll.id))
      .returning();
    return updated;
  }

  async close(streamPollId: string, userId: string): Promise<Poll> {
    const poll = await this.findOneByStreamPollId(streamPollId);
    if (poll.closedAt) return poll;
    await this.assertCanManage(poll, userId);

    try {
      await this.client().closePoll(streamPollId, userId);
    } catch (err) {
      this.logger.warn(
        `Failed to close poll ${streamPollId} in Stream: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    return this.finalize(streamPollId);
  }

  /**
   * Idempotent. Marks the poll closed and emits "poll closed" plus "winner
   * announced" notifications. Called by the close endpoint and by the frontend
   * when it observes a poll.closed event (e.g. the native "End poll" button).
   */
  async finalize(streamPollId: string): Promise<Poll> {
    const poll = await this.findOneByStreamPollId(streamPollId);
    if (poll.closedAt) return poll;

    const winnerTexts = await this.computeWinner(streamPollId);
    const closedAt = new Date();

    const [updated] = await this.db
      .update(polls)
      .set({ closedAt, updatedAt: closedAt })
      .where(and(eq(polls.id, poll.id), isNull(polls.closedAt)))
      .returning();

    if (!updated) return poll;

    const base = {
      description: poll.question,
      actionUrl: this.pollActionUrl(poll.channelId, poll.messageId),
    };

    await this.notifyMembers(poll.channelId, '', {
      type: 'poll_closed',
      title: 'Poll closed',
      ...base,
    });

    if (winnerTexts.length > 0) {
      const winnerLabel =
        winnerTexts.length === 1 ? winnerTexts[0] : winnerTexts.join(', ');
      await this.notifyMembers(poll.channelId, '', {
        type: 'poll_winner',
        title: `Winner: ${winnerLabel}`,
        ...base,
      });
    }

    this.logger.log(`Poll ${streamPollId} finalized`);
    return this.findOneByStreamPollId(streamPollId);
  }

  async remove(streamPollId: string, userId: string): Promise<void> {
    const poll = await this.findOneByStreamPollId(streamPollId);
    await this.assertCanManage(poll, userId);

    try {
      await this.client().deletePoll(streamPollId, userId);
    } catch (err) {
      this.logger.warn(
        `Failed to delete poll ${streamPollId} in Stream: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    try {
      await this.client().deleteMessage(poll.messageId, true);
    } catch (err) {
      this.logger.warn(
        `Failed to delete poll message ${poll.messageId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    await this.db.delete(polls).where(eq(polls.id, poll.id)).execute();
    this.logger.log(`Poll ${streamPollId} deleted by ${userId}`);
  }

  async autoCloseExpired(): Promise<void> {
    const due = await this.db
      .select()
      .from(polls)
      .where(and(isNull(polls.closedAt), lt(polls.deadline, new Date())))
      .execute();

    for (const poll of due) {
      try {
        await this.client().closePoll(poll.streamPollId);
      } catch (err) {
        this.logger.warn(
          `Auto-close failed for poll ${poll.streamPollId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
      await this.finalize(poll.streamPollId);
    }

    if (due.length > 0) {
      this.logger.log(`Auto-closed ${due.length} expired poll(s).`);
    }
  }
}
