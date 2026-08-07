import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const reminderPriorityEnum = pgEnum('reminder_priority', [
  'Low',
  'Medium',
  'High',
]);

export const userNotes = pgTable('user_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  sourceChannelId: varchar('source_channel_id', { length: 255 }),
  sourceMessageId: varchar('source_message_id', { length: 255 }),
  sourceSenderId: varchar('source_sender_id', { length: 255 }),
  sourceChannelName: varchar('source_channel_name', { length: 255 }),
  sourceMessageText: text('source_message_text'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const messageBookmarks = pgTable(
  'message_bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    sourceChannelId: varchar('source_channel_id', { length: 255 }).notNull(),
    sourceMessageId: varchar('source_message_id', { length: 255 }).notNull(),
    sourceSenderId: varchar('source_sender_id', { length: 255 }),
    sourceChannelName: varchar('source_channel_name', { length: 255 }),
    sourceMessageText: text('source_message_text'),
    sourceSenderName: varchar('source_sender_name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('message_bookmarks_user_message_idx').on(
      table.userId,
      table.sourceMessageId,
    ),
  ],
);

export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  priority: reminderPriorityEnum('priority').notNull().default('Medium'),
  notes: text('notes'),
  sourceChannelId: varchar('source_channel_id', { length: 255 }),
  sourceMessageId: varchar('source_message_id', { length: 255 }),
  sourceSenderId: varchar('source_sender_id', { length: 255 }),
  sourceChannelName: varchar('source_channel_name', { length: 255 }),
  isTriggered: boolean('is_triggered').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserNote = typeof userNotes.$inferSelect;
export type NewUserNote = typeof userNotes.$inferInsert;
export type MessageBookmark = typeof messageBookmarks.$inferSelect;
export type NewMessageBookmark = typeof messageBookmarks.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
