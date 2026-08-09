import type { AuthObject } from '../auth/auth-object';
import { NotificationsService } from './notifications.service';
interface SelfNotificationBody {
    type: string;
    title: string;
    description?: string;
    actionUrl?: string;
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findMine(auth: AuthObject): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        type: string;
        userId: string;
        title: string;
        actionUrl: string | null;
        isRead: boolean;
    }[]>;
    unreadCount(auth: AuthObject): Promise<number>;
    markRead(auth: AuthObject, id: string): Promise<void>;
    markAllRead(auth: AuthObject): Promise<void>;
    createSelf(auth: AuthObject, body: SelfNotificationBody): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        type: string;
        userId: string;
        title: string;
        actionUrl: string | null;
        isRead: boolean;
    }>;
}
export {};
