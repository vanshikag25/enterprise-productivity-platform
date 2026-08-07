import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { MessageBookmark } from '../database/schema/message-actions.schema';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
export declare class BookmarksService {
    private readonly db;
    constructor(db: NodePgDatabase);
    create(userId: string, dto: CreateBookmarkDto): Promise<MessageBookmark>;
    findAll(userId: string, filters?: {
        channelId?: string;
        search?: string;
    }): Promise<MessageBookmark[]>;
    findByMessage(userId: string, messageId: string): Promise<MessageBookmark | null>;
    findOne(id: string, userId: string): Promise<MessageBookmark>;
    remove(id: string, userId: string): Promise<void>;
}
