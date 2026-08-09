import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, or, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { userNotes, UserNote } from '../database/schema/message-actions.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async create(userId: string, dto: CreateNoteDto): Promise<UserNote> {
    const [note] = await this.db
      .insert(userNotes)
      .values({
        userId,
        title: dto.title,
        content: dto.content,
        sourceChannelId: dto.sourceChannelId ?? null,
        sourceMessageId: dto.sourceMessageId ?? null,
        sourceSenderId: dto.sourceSenderId ?? null,
        sourceChannelName: dto.sourceChannelName ?? null,
        sourceMessageText: dto.sourceMessageText ?? null,
      })
      .returning();
    return note;
  }

  async findAll(userId: string, search?: string): Promise<UserNote[]> {
    const conditions: (SQL | undefined)[] = [eq(userNotes.userId, userId)];
    if (search && search.trim()) {
      const term = search.trim();
      conditions.push(
        or(
          sql<boolean>`${userNotes.title} ILIKE ${`%${term}%`}`,
          sql<boolean>`${userNotes.content} ILIKE ${`%${term}%`}`,
        ),
      );
    }
    return this.db
      .select()
      .from(userNotes)
      .where(and(...conditions))
      .orderBy(desc(userNotes.updatedAt));
  }

  async findOne(id: string, userId: string): Promise<UserNote> {
    const [note] = await this.db
      .select()
      .from(userNotes)
      .where(and(eq(userNotes.id, id), eq(userNotes.userId, userId)));
    if (!note) throw new NotFoundException(`Note ${id} not found`);
    return note;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateNoteDto,
  ): Promise<UserNote> {
    await this.findOne(id, userId);
    const [updated] = await this.db
      .update(userNotes)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.sourceChannelId !== undefined && {
          sourceChannelId: dto.sourceChannelId,
        }),
        ...(dto.sourceMessageId !== undefined && {
          sourceMessageId: dto.sourceMessageId,
        }),
        ...(dto.sourceSenderId !== undefined && {
          sourceSenderId: dto.sourceSenderId,
        }),
        ...(dto.sourceChannelName !== undefined && {
          sourceChannelName: dto.sourceChannelName,
        }),
        ...(dto.sourceMessageText !== undefined && {
          sourceMessageText: dto.sourceMessageText,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(userNotes.id, id), eq(userNotes.userId, userId)))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.db
      .delete(userNotes)
      .where(and(eq(userNotes.id, id), eq(userNotes.userId, userId)));
  }
}
