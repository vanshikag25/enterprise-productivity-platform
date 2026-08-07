import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Reminder } from '../database/schema/message-actions.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
export declare class RemindersService {
    private readonly db;
    private readonly notificationsService;
    constructor(db: NodePgDatabase, notificationsService: NotificationsService);
    create(userId: string, dto: CreateReminderDto): Promise<Reminder>;
    findAll(userId: string, includeTriggered?: boolean): Promise<Reminder[]>;
    findOne(id: string, userId: string): Promise<Reminder>;
    update(id: string, userId: string, dto: UpdateReminderDto): Promise<Reminder>;
    remove(id: string, userId: string): Promise<void>;
    trigger(id: string, userId: string): Promise<Reminder>;
}
