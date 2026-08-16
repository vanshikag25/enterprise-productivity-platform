import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  messageTranslations,
  MessageTranslation,
} from '../database/schema/message-translations.schema';
import { StreamService } from '../stream/stream.service';
import { isSupportedLanguage } from '../languages';
import {
  TRANSLATION_PROVIDER,
  TranslationProvider,
} from './translation.provider';

export interface TranslationResponse {
  messageId: string;
  targetLanguage: string;
  sourceLanguage: string | null;
  translatedText: string;
  /** True when served from the translation cache (no AI call was made). */
  cached: boolean;
  provider: string;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly streamService: StreamService,
    @Inject(TRANSLATION_PROVIDER)
    private readonly provider: TranslationProvider,
  ) {}

  /**
   * Translates a single channel message into `targetLanguage` for a channel
   * member. Access mirrors the rest of the chat feature: the requester must
   * belong to the conversation, and the message must belong to the given
   * channel — so only content the user can already see is ever translated.
   * Results are cached per (message, target language) and keyed by the source
   * text hash so edited messages are re-translated automatically.
   */
  async translate(
    channelId: string,
    messageId: string,
    userId: string,
    targetLanguage: string,
  ): Promise<TranslationResponse> {
    const language = targetLanguage.trim().toLowerCase();
    if (!isSupportedLanguage(language)) {
      throw new BadRequestException(
        `Unsupported target language "${targetLanguage}".`,
      );
    }

    await this.resolveChannel(channelId, userId);

    const { message } = await this.fetchMessage(messageId);
    if (message.channel?.id && message.channel.id !== channelId) {
      throw new BadRequestException(
        'Message does not belong to the given channel',
      );
    }

    const text = (message.text ?? '').trim();
    if (!text) {
      throw new BadRequestException(
        'This message has no text to translate.',
      );
    }

    const sourceHash = this.hash(text);

    const cached = await this.findCached(messageId, language);
    if (cached && cached.sourceHash === sourceHash) {
      return {
        messageId,
        targetLanguage: language,
        sourceLanguage: cached.detectedSourceLanguage ?? null,
        translatedText: cached.translatedText,
        cached: true,
        provider: cached.provider,
      };
    }

    const result = await this.provider.translate({
      text,
      targetLanguage: language,
    });

    const translatedText =
      result.detectedSourceLanguage === language ? text : result.translatedText;

    // Skip storing an identity "translation" (source already matches target).
    if (result.detectedSourceLanguage !== language) {
      await this.upsertCache({
        messageId,
        targetLanguage: language,
        sourceHash,
        sourceText: text,
        detectedSourceLanguage: result.detectedSourceLanguage,
        translatedText,
        provider: result.provider,
      });
    }

    return {
      messageId,
      targetLanguage: language,
      sourceLanguage: result.detectedSourceLanguage ?? null,
      translatedText,
      cached: false,
      provider: result.provider,
    };
  }

  // --- Cache -----------------------------------------------------------------

  private async findCached(
    messageId: string,
    targetLanguage: string,
  ): Promise<MessageTranslation | undefined> {
    const [row] = await this.db
      .select()
      .from(messageTranslations)
      .where(
        and(
          eq(messageTranslations.messageId, messageId),
          eq(messageTranslations.targetLanguage, targetLanguage),
        ),
      )
      .limit(1);
    return row;
  }

  private async upsertCache(input: {
    messageId: string;
    targetLanguage: string;
    sourceHash: string;
    sourceText: string;
    detectedSourceLanguage: string | null;
    translatedText: string;
    provider: string;
  }): Promise<void> {
    await this.db
      .insert(messageTranslations)
      .values(input)
      .onConflictDoUpdate({
        target: [
          messageTranslations.messageId,
          messageTranslations.targetLanguage,
        ],
        set: {
          sourceHash: input.sourceHash,
          sourceText: input.sourceText,
          detectedSourceLanguage: input.detectedSourceLanguage,
          translatedText: input.translatedText,
          provider: input.provider,
          updatedAt: new Date(),
        },
      });
  }

  // --- Channel & message helpers -------------------------------------------

  private async resolveChannel(channelId: string, userId: string): Promise<void> {
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
      if (!members.includes(userId)) {
        throw new ForbiddenException(
          'You are not a member of this conversation',
        );
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.warn(
        `Failed to describe channel ${channelId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw new NotFoundException(`Conversation ${channelId} not found`);
    }
  }

  private async fetchMessage(messageId: string): Promise<{
    message: { id?: string; text?: string; channel?: { id?: string } | null };
  }> {
    try {
      return await this.streamService.getClient().getMessage(messageId);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch message ${messageId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      throw new NotFoundException(`Message ${messageId} not found`);
    }
  }

  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}