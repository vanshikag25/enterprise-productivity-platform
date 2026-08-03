import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Notification } from '../database/schema/notifications.schema';
export interface CreateNotificationInput {
    userId: string;
    type: string;
    title: string;
    description?: string;
    actionUrl?: string;
}
export declare class NotificationsService {
    private readonly db;
    constructor(db: NodePgDatabase);
    create(input: CreateNotificationInput): Promise<Notification>;
    createMany(inputs: CreateNotificationInput[]): Promise<void>;
    findMine(userId: string): Promise<Notification[]>;
    unreadCount(userId: string): Promise<number>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
