import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, or, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  messageBookmarks,
  MessageBookmark,
} from '../database/schema/message-actions.schema';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async create(
    userId: string,
    dto: CreateBookmarkDto,
  ): Promise<MessageBookmark> {
    const existing = await this.findByMessage(userId, dto.sourceMessageId);
    if (existing) return existing;

    const [bookmark] = await this.db
      .insert(messageBookmarks)
      .values({
        userId,
        sourceChannelId: dto.sourceChannelId,
        sourceMessageId: dto.sourceMessageId,
        sourceSenderId: dto.sourceSenderId ?? null,
        sourceChannelName: dto.sourceChannelName ?? null,
        sourceMessageText: dto.sourceMessageText ?? null,
        sourceSenderName: dto.sourceSenderName ?? null,
      })
      .returning();
    return bookmark;
  }

  async findAll(
    userId: string,
    filters: { channelId?: string; search?: string } = {},
  ): Promise<MessageBookmark[]> {
    const conditions: (SQL | undefined)[] = [
      eq(messageBookmarks.userId, userId),
    ];
    if (filters.channelId) {
      conditions.push(eq(messageBookmarks.sourceChannelId, filters.channelId));
    }
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      conditions.push(
        or(
          sql<boolean>`${messageBookmarks.sourceMessageText} ILIKE ${`%${term}%`}`,
          sql<boolean>`${messageBookmarks.sourceSenderName} ILIKE ${`%${term}%`}`,
          sql<boolean>`${messageBookmarks.sourceChannelName} ILIKE ${`%${term}%`}`,
        ),
      );
    }
    return this.db
      .select()
      .from(messageBookmarks)
      .where(and(...conditions))
      .orderBy(desc(messageBookmarks.createdAt));
  }

  async findByMessage(
    userId: string,
    messageId: string,
  ): Promise<MessageBookmark | null> {
    const [bookmark] = await this.db
      .select()
      .from(messageBookmarks)
      .where(
        and(
          eq(messageBookmarks.userId, userId),
          eq(messageBookmarks.sourceMessageId, messageId),
        ),
      );
    return bookmark ?? null;
  }

  async findOne(id: string, userId: string): Promise<MessageBookmark> {
    const [bookmark] = await this.db
      .select()
      .from(messageBookmarks)
      .where(
        and(eq(messageBookmarks.id, id), eq(messageBookmarks.userId, userId)),
      );
    if (!bookmark) throw new NotFoundException(`Bookmark ${id} not found`);
    return bookmark;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.db
      .delete(messageBookmarks)
      .where(
        and(eq(messageBookmarks.id, id), eq(messageBookmarks.userId, userId)),
      );
  }
}
