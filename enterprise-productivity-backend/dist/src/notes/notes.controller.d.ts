import type { AuthObject } from '../auth/auth-object';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
export declare class NotesController {
    private readonly notesService;
    constructor(notesService: NotesService);
    create(auth: AuthObject, dto: CreateNoteDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        sourceChannelId: string | null;
        sourceMessageId: string | null;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        content: string;
        sourceMessageText: string | null;
    }>;
    findAll(auth: AuthObject, search?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        sourceChannelId: string | null;
        sourceMessageId: string | null;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        content: string;
        sourceMessageText: string | null;
    }[]>;
    findOne(auth: AuthObject, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        sourceChannelId: string | null;
        sourceMessageId: string | null;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        content: string;
        sourceMessageText: string | null;
    }>;
    update(auth: AuthObject, id: string, dto: UpdateNoteDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        sourceChannelId: string | null;
        sourceMessageId: string | null;
        sourceSenderId: string | null;
        sourceChannelName: string | null;
        content: string;
        sourceMessageText: string | null;
    }>;
    remove(auth: AuthObject, id: string): Promise<void>;
}
