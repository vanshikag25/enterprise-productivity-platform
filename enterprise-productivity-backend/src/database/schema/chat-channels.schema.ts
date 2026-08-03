import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const chatChannelAvatars = pgTable('chat_channel_avatars', {
  channelId: varchar('channel_id', { length: 255 }).primaryKey(),
  avatarUrl: varchar('avatar_url', { length: 2048 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ChatChannelAvatar = typeof chatChannelAvatars.$inferSelect;
export type NewChatChannelAvatar = typeof chatChannelAvatars.$inferInsert;
