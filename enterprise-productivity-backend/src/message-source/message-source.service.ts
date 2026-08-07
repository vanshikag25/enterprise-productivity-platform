import { Injectable, Logger } from '@nestjs/common';
import { StreamService } from '../stream/stream.service';

export interface SourceMessageRef {
  sourceChannelId?: string;
  sourceMessageId?: string;
  sourceSenderId?: string;
  sourceChannelName?: string;
}

export interface ConfirmSourceMessageInput {
  channelId: string;
  messageId: string;
  userId: string;
  confirmationText: string;
}

@Injectable()
export class MessageSourceService {
  private readonly logger = new Logger(MessageSourceService.name);

  constructor(private readonly streamService: StreamService) {}

  /**
   * Verifies that a Stream message belongs to the given channel and posts a
   * confirmation message back to that channel on behalf of the user.
   * Returns false when the reference is invalid (missing or mismatched),
   * so callers can skip follow-up work safely.
   */
  async confirmSourceMessage(
    input: ConfirmSourceMessageInput,
  ): Promise<boolean> {
    const { channelId, messageId, userId, confirmationText } = input;
    if (!channelId || !messageId) return false;

    try {
      const client = this.streamService.getClient();
      const { message } = await client.getMessage(messageId);
      if (message.channel?.id && message.channel.id !== channelId) {
        this.logger.warn(
          `Message ${messageId} does not belong to channel ${channelId}; skipping confirmation.`,
        );
        return false;
      }

      const channel = client.channel('messaging', channelId);
      await channel.sendMessage({
        text: confirmationText,
        user_id: userId,
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `Failed to confirm source message ${messageId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return false;
    }
  }
}
