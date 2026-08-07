import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UserNote } from '../database/schema/message-actions.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
export declare class NotesService {
    private readonly db;
    constructor(db: NodePgDatabase);
    create(userId: string, dto: CreateNoteDto): Promise<UserNote>;
    findAll(userId: string, search?: string): Promise<UserNote[]>;
    findOne(id: string, userId: string): Promise<UserNote>;
    update(id: string, userId: string, dto: UpdateNoteDto): Promise<UserNote>;
    remove(id: string, userId: string): Promise<void>;
}
