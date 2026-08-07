import type { AuthObject } from '@clerk/backend';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
export declare class BookmarksController {
    private readonly bookmarksService;
    constructor(bookmarksService: BookmarksService);
    create(auth: AuthObject, dto: CreateBookmarkDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        sourceChannelId: string;
        sourceMessageId: string;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        sourceMessageText: string | null;
        sourceSenderName: string | null;
    }>;
    findAll(auth: AuthObject, channelId?: string, search?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        sourceChannelId: string;
        sourceMessageId: string;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        sourceMessageText: string | null;
        sourceSenderName: string | null;
    }[]>;
    findByMessage(auth: AuthObject, messageId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        sourceChannelId: string;
        sourceMessageId: string;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        sourceMessageText: string | null;
        sourceSenderName: string | null;
    } | null>;
    remove(auth: AuthObject, id: string): Promise<void>;
}
