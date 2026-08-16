import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StreamService } from '../stream/stream.service';
import {
  SMART_REPLY_PROVIDER,
  SmartReplyMessage,
  SmartReplyProvider,
  SmartReplyResult,
} from './smart-reply.provider';

interface ChannelMeta {
  name: string | null;
  memberCount: number;
  members: string[];
}

const MESSAGES_LIMIT = 40;

@Injectable()
export class SmartReplyService {
  private readonly logger = new Logger(SmartReplyService.name);

  constructor(
    private readonly streamService: StreamService,
    @Inject(SMART_REPLY_PROVIDER)
    private readonly provider: SmartReplyProvider,
  ) {}

  /**
   * Analyzes the latest conversation messages and returns short, contextual
   * reply suggestions for the requesting user. The user must be a member of
   * the channel, mirroring the access rules of the rest of the chat feature.
   */
  async getReplies(
    channelId: string,
    userId: string,
  ): Promise<SmartReplyResult> {
    const meta = await this.resolveChannel(channelId, userId);
    const messages = await this.fetchRecentMessages(channelId);

    return this.provider.generate({
      channelId,
      channelName: meta.name,
      memberCount: meta.memberCount,
      messages,
      requesterId: userId,
    });
  }

  // --- Channel helpers -----------------------------------------------------

  private async describeChannel(channelId: string): Promise<ChannelMeta> {
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
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

  // --- Message fetching ----------------------------------------------------

  private async fetchRecentMessages(
    channelId: string,
  ): Promise<SmartReplyMessage[]> {
    const channel = this.streamService
      .getClient()
      .channel('messaging', channelId);
    try {
      const { messages } = await channel.query({
        messages: { limit: MESSAGES_LIMIT },
      });
      // Newest first is easiest to reason about for reply suggestions.
      return messages
        .filter((m) => !m.type || m.type === 'regular')
        .map((m) => ({
          user: m.user?.name ?? m.user?.id ?? 'Unknown',
          userId: m.user?.id ?? null,
          text: m.text ?? '',
          createdAt: m.created_at ?? null,
        }));
    } catch (err) {
      this.logger.warn(
        `Failed to fetch recent messages for channel ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw new NotFoundException(`Conversation ${channelId} not found`);
    }
  }
}
