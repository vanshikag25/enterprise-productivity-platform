import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import {
  notifications,
  Notification,
} from '../database/schema/notifications.schema';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  description?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const [n] = await this.db.insert(notifications).values(input).returning();
    return n;
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await this.db.insert(notifications).values(inputs);
  }

  async findMine(userId: string): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async unreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );
    return rows.length;
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }
}
